import type {
  AdaptedWallet,
  ProgressData,
  Execute,
  RelayTransaction
} from '../types/index.js'
import { getClient } from '../client.js'
import {
  executeSteps,
  adaptViemWallet,
  getCurrentStepData,
  safeStructuredClone,
  request as requestApi,
  getApiKeyHeader
} from '../utils/index.js'
import { type WalletClient } from 'viem'
import { isViemWalletClient } from '../utils/viemWallet.js'
import { isDeadAddress } from '../constants/address.js'
import { extractDepositRequestId } from '../utils/websocket.js'

export type ExecuteActionParameters = {
  quote: Execute
  wallet: AdaptedWallet | WalletClient
  depositGasLimit?: string
  onProgress?: (data: ProgressData) => any
  onTransactionReceived?: (transaction: RelayTransaction) => any
}

/**
 * Execute crosschain using Relay
 * @param data.quote A Relay quote retrieved using {@link getQuote}
 * @param data.depositGasLimit A gas limit to use in base units (wei, etc)
 * @param data.wallet Wallet object that adheres to the AdaptedWakket interface or a viem WalletClient
 * @param data.onProgress Callback to update UI state as execution progresses
 * @param data.onTransactionReceived Callback fired when /requests metadata is available
 * @param abortController Optional AbortController to cancel the execution
 */
export function execute(data: ExecuteActionParameters): Promise<{
  data: Execute
  abortController: AbortController
}> & {
  abortController: AbortController
} {
  const { quote, wallet, depositGasLimit, onProgress, onTransactionReceived } =
    data
  const client = getClient()

  if (!client.baseApiUrl || !client.baseApiUrl.length) {
    throw new ReferenceError('RelayClient missing api url configuration')
  }

  let adaptedWallet: AdaptedWallet | undefined
  if (wallet) {
    adaptedWallet = isViemWalletClient(wallet)
      ? adaptViemWallet(wallet as WalletClient)
      : wallet
  }

  try {
    if (!adaptedWallet) {
      throw new Error('AdaptedWallet is required to execute steps')
    }

    // Instantiate a new abort controller
    const abortController = new AbortController()

    const chainId = quote.details?.currencyIn?.currency?.chainId

    if (chainId === undefined) {
      throw new Error('Missing chainId from quote')
    }

    if (isDeadAddress(quote?.details?.recipient)) {
      throw new Error('Recipient should never be burn address')
    }

    if (isDeadAddress(quote?.details?.sender)) {
      throw new Error('Sender should never be burn address')
    }

    const { request, ...restOfQuote } = quote
    const _quote = safeStructuredClone(restOfQuote)

    // Build the promise that carries out the execution
    const executionPromise: Promise<{
      data: Execute
      abortController: AbortController
    }> = new Promise((resolve, reject) => {
      executeSteps(
        chainId,
        request,
        adaptedWallet,
        ({ steps, fees, breakdown, details, refunded, error }) => {
          if (abortController.signal.aborted) {
            console.log(
              'Relay SDK: Execution aborted, skipping progress callback'
            )
            return
          }

          const { currentStep, currentStepItem, txHashes } =
            getCurrentStepData(steps)

          onProgress?.({
            steps,
            fees,
            breakdown,
            details,
            currentStep,
            currentStepItem,
            txHashes,
            refunded,
            error
          })
        },
        _quote,
        depositGasLimit
          ? {
              deposit: {
                gasLimit: depositGasLimit
              }
            }
          : undefined
      )
        .then((data) => {
          resolve({ data, abortController })
          enrichExecutionWithRequestMetadata({
            data,
            abortController,
            onProgress,
            onTransactionReceived
          }).catch(() => undefined)
        })
        .catch(reject)
    })

    // Attach the AbortController to the promise itself so callers can access it immediately
    ;(executionPromise as any).abortController = abortController

    return executionPromise as typeof executionPromise & {
      abortController: AbortController
    }
  } catch (err: any) {
    console.error(err)
    throw err
  }
}

async function enrichExecutionWithRequestMetadata({
  data,
  abortController,
  onProgress,
  onTransactionReceived
}: {
  data: Execute
  abortController: AbortController
  onProgress?: (data: ProgressData) => any
  onTransactionReceived?: (transaction: RelayTransaction) => any
}) {
  try {
    const requestId = extractDepositRequestId(data.steps)
    if (!requestId) {
      return
    }

    const transaction = await pollRequestMetadataById(requestId)
    if (!transaction) {
      return
    }

    const metadata = transaction.data?.metadata
    const nextCurrencyOut = metadata?.currencyOut

    if (!nextCurrencyOut) {
      return
    }

    onTransactionReceived?.(transaction)

    const existingCurrencyOut = data.details?.currencyOut
    const amountChanged =
      nextCurrencyOut.amount !== existingCurrencyOut?.amount ||
      nextCurrencyOut.amountFormatted !== existingCurrencyOut?.amountFormatted ||
      nextCurrencyOut.amountUsd !== existingCurrencyOut?.amountUsd

    if (!amountChanged) {
      return
    }

    data.details = {
      ...data.details,
      sender: metadata?.sender ?? data.details?.sender,
      recipient: metadata?.recipient ?? data.details?.recipient,
      currencyIn: metadata?.currencyIn ?? data.details?.currencyIn,
      currencyOut: nextCurrencyOut,
      currencyGasTopup: metadata?.currencyGasTopup ?? data.details?.currencyGasTopup
    }

    if (!onProgress || abortController.signal.aborted) {
      return
    }

    const { currentStep, currentStepItem, txHashes } = getCurrentStepData(
      data.steps
    )
    onProgress({
      steps: data.steps,
      fees: data.fees,
      breakdown: data.breakdown,
      details: data.details,
      currentStep,
      currentStepItem,
      txHashes,
      refunded: data.refunded,
      error: data.error
    })
  } catch {
    return
  }
}

async function pollRequestMetadataById(
  requestId: string
): Promise<RelayTransaction | undefined> {
  const client = getClient()
  const pollingInterval = client.pollingInterval ?? 5000
  const maxAttempts =
    client.maxPollingAttemptsBeforeTimeout ??
    (2.5 * 60 * 1000) / pollingInterval
  const requestConfig = {
    url: `${client.baseApiUrl}/requests/v2`,
    method: 'get' as const,
    params: {
      id: requestId,
      limit: 1,
      sortBy: 'updatedAt' as const,
      sortDirection: 'desc' as const
    },
    headers: {
      'Content-Type': 'application/json',
      ...getApiKeyHeader(client, client.baseApiUrl),
      'relay-sdk-version': client.version ?? 'unknown'
    }
  }

  let transaction: RelayTransaction | undefined = undefined

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = (await requestApi(requestConfig)) as {
      data?: {
        requests?: RelayTransaction[]
      }
    }
    transaction = res.data?.requests?.[0]

    if (transaction?.data?.metadata?.currencyOut) {
      break
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, pollingInterval))
    }
  }

  return transaction?.data?.metadata?.currencyOut ? transaction : undefined
}
