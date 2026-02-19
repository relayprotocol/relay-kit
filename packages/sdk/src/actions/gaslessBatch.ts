import {
  createPublicClient,
  encodeAbiParameters,
  http,
  type Account,
  type Address,
  type Hex,
  type WalletClient
} from 'viem'
import type { AxiosRequestConfig } from 'axios'
import type { Execute } from '../types/Execute.js'
import type { BatchCall, BatchExecutorConfig } from '../types/BatchExecutor.js'
import type { paths } from '../types/api.js'
import { getClient } from '../client.js'
import { axios } from '../utils/axios.js'
import { APIError, getApiKeyHeader, LogLevel } from '../utils/index.js'
import { createCaliburExecutor } from '../utils/caliburExecutor.js'

type ExecuteBody = NonNullable<
  paths['/execute']['post']['requestBody']['content']['application/json']
>

type ExecuteResponse = NonNullable<
  paths['/execute']['post']['responses']['200']['content']['application/json']
>

export type GaslessBatchProgress = {
  status:
    | 'signing_authorization'
    | 'signing_batch'
    | 'submitting'
    | 'polling'
    | 'success'
    | 'failure'
  requestId?: string
  details?: any
}

export type ExecuteGaslessBatchParameters = {
  /** The quote obtained from getQuote() */
  quote: Execute
  /** viem WalletClient with an account attached */
  walletClient: WalletClient
  /** Batch executor config — defaults to Calibur */
  executor?: BatchExecutorConfig
  /** Whether the sponsor pays all fees (default: false) */
  subsidizeFees?: boolean
  /** Gas overhead for the origin chain gasless transaction.
   *  Overrides the executor's default if provided (Calibur default: 80,000). */
  originGasOverhead?: number
  /** Progress callback for each stage of the flow */
  onProgress?: (data: GaslessBatchProgress) => void
}

export type GaslessBatchResult = {
  requestId: string
}

/**
 * Execute a gasless batch swap using EIP-7702 delegation.
 *
 * Takes a quote from getQuote(), delegates the user's EOA to a batch executor
 * (defaults to Calibur), batches the quote's transaction steps atomically,
 * and submits via Relay's /execute API with the sponsor covering gas costs.
 *
 * @example
 * ```ts
 * const quote = await getQuote({ ... })
 * const result = await executeGaslessBatch({ quote, walletClient })
 * console.log(result.requestId)
 * ```
 *
 * @param parameters - {@link ExecuteGaslessBatchParameters}
 */
export async function executeGaslessBatch(
  parameters: ExecuteGaslessBatchParameters
): Promise<GaslessBatchResult> {
  const {
    quote,
    walletClient,
    executor: executorConfig,
    subsidizeFees = false,
    originGasOverhead: originGasOverheadOverride,
    onProgress
  } = parameters

  const client = getClient()

  if (!client.baseApiUrl || !client.baseApiUrl.length) {
    throw new ReferenceError('RelayClient missing api url configuration')
  }

  if (!client.apiKey) {
    throw new Error(
      'API key is required for gasless batch execution. Configure it via createClient({ apiKey: "..." })'
    )
  }

  const account = walletClient.account
  if (!account) {
    throw new Error(
      'WalletClient must have an account. Create it with createWalletClient({ account, ... })'
    )
  }

  const userAddress = account.address
  const executor = executorConfig ?? createCaliburExecutor()
  const originGasOverhead =
    originGasOverheadOverride ?? executor.originGasOverhead

  client.log(
    ['Gasless Batch: starting', { user: userAddress, executor: executor.address }],
    LogLevel.Info
  )

  // ── 1. Extract calls and chainId from quote steps ────────────────────

  const calls: BatchCall[] = []
  let requestId: string | undefined
  let chainId: number | undefined

  for (const step of quote.steps) {
    if (step.kind !== 'transaction') continue
    for (const item of step.items) {
      if (!item.data) continue
      calls.push({
        to: item.data.to as Address,
        value: BigInt(item.data.value || '0'),
        data: item.data.data as Hex
      })
      if (!chainId && item.data.chainId) {
        chainId = item.data.chainId
      }
    }
    if (step.requestId) requestId = step.requestId
  }

  if (calls.length === 0) {
    throw new Error('No transaction steps found in quote')
  }

  client.log(
    [`Gasless Batch: extracted ${calls.length} calls from quote on chain ${chainId}`, { requestId }],
    LogLevel.Verbose
  )

  if (!chainId) {
    throw new Error(
      'Could not determine origin chainId from quote steps'
    )
  }

  // Create a public client for on-chain reads
  const chain = client.chains.find((c) => c.id === chainId)
  const rpcUrl = chain?.httpRpcUrl
  const publicClient = createPublicClient({
    chain: chain?.viemChain,
    transport: rpcUrl ? http(rpcUrl) : http()
  })

  // ── 2. Check delegation ──────────────────────────────────────────────

  onProgress?.({ status: 'signing_authorization', requestId })

  const code = await publicClient.getCode({ address: userAddress })
  const isDelegated =
    code?.toLowerCase().startsWith('0xef0100') &&
    code.slice(8).toLowerCase() ===
      executor.address.slice(2).toLowerCase()

  client.log(
    [`Gasless Batch: delegation status — ${isDelegated ? 'already delegated' : 'needs delegation'}`],
    LogLevel.Info
  )

  // ── 3. Sign EIP-7702 authorization (if needed) ──────────────────────

  let authorization:
    | ExecuteBody['data']['authorizationList']
    | undefined

  if (!isDelegated) {
    const currentNonce = await publicClient.getTransactionCount({
      address: userAddress
    })

    const signedAuth = await walletClient.signAuthorization({
      account: account as Account,
      contractAddress: executor.address,
      chainId,
      nonce: currentNonce
    })

    authorization = [
      {
        chainId: Number(signedAuth.chainId),
        address: signedAuth.address,
        nonce: signedAuth.nonce,
        yParity: signedAuth.yParity ?? 0,
        r: signedAuth.r,
        s: signedAuth.s
      }
    ]

    client.log(
      ['Gasless Batch: signed 7702 authorization'],
      LogLevel.Verbose
    )
  }

  // ── 4. Sign batch via EIP-712 ────────────────────────────────────────

  onProgress?.({ status: 'signing_batch', requestId })

  const nonce = await executor.getNonce(publicClient, userAddress)

  client.log(
    [`Gasless Batch: executor nonce ${nonce}`],
    LogLevel.Verbose
  )

  const signedMessage = executor.buildSignMessage(calls, nonce)
  const domain = executor.buildSignDomain(chainId, userAddress)

  const signature = await walletClient.signTypedData({
    account: account as Account,
    domain,
    types: executor.eip712Types,
    primaryType: executor.eip712PrimaryType,
    message: signedMessage
  })

  // Wrap signature: abi.encode(signature, hookData) — empty hookData
  const wrappedSignature = encodeAbiParameters(
    [{ type: 'bytes' }, { type: 'bytes' }],
    [signature, '0x']
  )

  const batchCallData = executor.encodeExecute(
    signedMessage,
    wrappedSignature
  )

  client.log(
    ['Gasless Batch: signed EIP-712 batch'],
    LogLevel.Verbose
  )

  // ── 5. Submit via /execute ───────────────────────────────────────────

  onProgress?.({ status: 'submitting', requestId })

  const executeBody: ExecuteBody = {
    executionKind: 'rawCalls',
    data: {
      chainId,
      to: userAddress,
      data: batchCallData,
      value: '0',
      ...(authorization ? { authorizationList: authorization } : {})
    },
    executionOptions: {
      referrer: client.source || '',
      subsidizeFees
    },
    ...(originGasOverhead != null ? { originGasOverhead } : {}),
    ...(requestId ? { requestId } : {})
  }

  const executeRequest: AxiosRequestConfig = {
    url: `${client.baseApiUrl}/execute`,
    method: 'post',
    data: executeBody,
    headers: {
      ...getApiKeyHeader(client),
      'relay-sdk-version': client.version ?? 'unknown'
    }
  }

  client.log(
    ['Gasless Batch: submitting to /execute', { chainId, requestId, subsidizeFees }],
    LogLevel.Info
  )

  let executeResult: ExecuteResponse
  try {
    const res = await axios.request(executeRequest)
    executeResult = res.data
  } catch (error: any) {
    throw new APIError(
      error?.response?.data?.error ||
        error?.message ||
        'Gasless batch execution failed',
      error?.response?.status || 500,
      error?.response?.data || error
    )
  }

  const finalRequestId =
    executeResult.requestId || requestId || ''

  client.log(
    [`Gasless Batch: submitted, requestId ${finalRequestId}`],
    LogLevel.Info
  )

  // ── 6. Poll for completion ───────────────────────────────────────────

  onProgress?.({ status: 'polling', requestId: finalRequestId })

  const maxAttempts = client.maxPollingAttemptsBeforeTimeout ?? 60
  const pollingInterval = client.pollingInterval ?? 5000

  for (let i = 0; i < maxAttempts; i++) {
    const statusRequest: AxiosRequestConfig = {
      url: `${client.baseApiUrl}/intents/status/v3`,
      method: 'get',
      params: { requestId: finalRequestId },
      headers: getApiKeyHeader(client)
    }

    try {
      const res = await axios.request(statusRequest)
      const status = res.data

      client.log(
        [`Gasless Batch: poll [${i + 1}/${maxAttempts}] status=${status.status}`],
        LogLevel.Verbose
      )

      if (status.status === 'success') {
        client.log(
          [`Gasless Batch: complete — requestId ${finalRequestId}`],
          LogLevel.Info
        )
        onProgress?.({
          status: 'success',
          requestId: finalRequestId,
          details: status
        })
        return { requestId: finalRequestId }
      }

      if (status.status === 'failure' || status.status === 'refund') {
        onProgress?.({
          status: 'failure',
          requestId: finalRequestId,
          details: status
        })
        throw new Error(
          `Gasless batch request failed with status: ${status.status}`
        )
      }
    } catch (error: any) {
      if (error.message?.startsWith('Gasless batch request failed')) {
        throw error
      }
      // Transient polling error — continue
    }

    await new Promise((resolve) => setTimeout(resolve, pollingInterval))
  }

  throw new Error(
    `Polling timed out after ${maxAttempts} attempts for request ${finalRequestId}`
  )
}
