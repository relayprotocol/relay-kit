import { type Address, type TransactionReceipt } from 'viem'
import { LogLevel } from './logger.js'
import type {
  Execute,
  AdaptedWallet,
  TransactionStepItem,
  paths,
  SvmReceipt,
  SuiReceipt
} from '../types/index.js'
import { axios } from '../utils/axios.js'
import type {
  AxiosRequestConfig,
  AxiosRequestHeaders,
  AxiosResponse
} from 'axios'
import { getClient } from '../client.js'
import {
  DepositTransactionTimeoutError,
  SolverStatusTimeoutError,
  TransactionConfirmationError
} from '../errors/index.js'
import { repeatUntilOk } from '../utils/repeatUntilOk.js'
import {
  getTenderlyDetails,
  type TenderlyErrorInfo
} from '../utils/getTenderlyDetails.js'

/**
 * Safe txhash.wait which handles replacements when users speed up the transaction
 * @param url an URL object
 * @returns A Promise to wait on
 */
export async function sendTransactionSafely(
  chainId: number,
  items: TransactionStepItem | TransactionStepItem[],
  step: Execute['steps'][0],
  wallet: AdaptedWallet,
  setTxHashes: (
    tx: NonNullable<Execute['steps'][0]['items']>[0]['txHashes']
  ) => void,
  setInternalTxHashes: (
    tx: NonNullable<Execute['steps'][0]['items']>[0]['internalTxHashes']
  ) => void,
  onWebsocketFailed: (() => Promise<void>) | null,
  request: AxiosRequestConfig,
  headers?: AxiosRequestHeaders,
  crossChainIntentChainId?: number,
  isValidating?: (res?: AxiosResponse<any, any>) => void,
  details?: Execute['details'],
  setReceipt?: (receipt: TransactionReceipt | SvmReceipt | SuiReceipt) => void,
  setCheckStatus?: (
    checkStatus: NonNullable<Execute['steps'][0]['items']>[0]['checkStatus']
  ) => void,
  statusControl?: { lastKnownStatus?: string }
) {
  const client = getClient()
  try {
    //In some cases wallets can be delayed when switching chains, causing this check to fail.
    //To work around this we check the chain id of the active wallet a few times before declaring it a failure
    await repeatUntilOk(
      async () => {
        const walletChainId = await wallet.getChainId()
        return walletChainId === chainId
      },
      10,
      undefined,
      250
    )
  } catch (e) {
    const walletChainId = await wallet.getChainId()
    throw `Current chain id: ${walletChainId} does not match expected chain id: ${chainId} `
  }
  let receipt: TransactionReceipt | SvmReceipt | SuiReceipt | undefined
  let transactionCancelled = false
  let confirmationError = false
  const pollingInterval = client.pollingInterval ?? 5000
  const maximumAttempts =
    client.maxPollingAttemptsBeforeTimeout ??
    (2.5 * 60 * 1000) / pollingInterval // default to 2 minutes and 30 seconds worth of attempts
  let waitingForConfirmation = true
  let attemptCount = 0
  let txHash: string | undefined

  // Check if batching txs is supported and if there are multiple items to batch
  const isBatchTransaction = Boolean(
    Array.isArray(items) &&
      items.length > 1 &&
      wallet.handleBatchTransactionStep
  )

  if (isBatchTransaction) {
    txHash = await wallet.handleBatchTransactionStep?.(
      chainId,
      items as TransactionStepItem[]
    )
  } else {
    txHash = await wallet.handleSendTransactionStep(
      chainId,
      Array.isArray(items) ? items[0] : items,
      step
    )
  }

  if ((txHash as any) === 'null') {
    throw 'User rejected the request'
  }

  // Find the first item with a check endpoint
  const check = Array.isArray(items)
    ? items.find((item) => item.check)?.check
    : items.check

  // Post transaction to solver
  postTransactionToSolver({
    txHash,
    chainId,
    step,
    request,
    headers,
    source: client.source
  })

  if (
    txHash &&
    !isBatchTransaction &&
    !Array.isArray(items) &&
    chainId === details?.currencyOut?.currency?.chainId
  ) {
    postSameChainTransactionToSolver({
      calldata: JSON.stringify({ ...items.data, txHash }),
      chainId,
      step,
      request,
      headers,
      source: client.source
    })
  }

  if (!txHash) {
    throw Error(
      'Transaction hash not returned from handleSendTransactionStep method'
    )
  }

  setTxHashes([
    { txHash: txHash, chainId: chainId, isBatchTx: isBatchTransaction }
  ])

  //Set up internal functions
  const validate = (res: AxiosResponse<any, any>) => {
    getClient()?.log(
      [
        'Execute Steps: Polling for confirmation',
        JSON.stringify(res.data, null, 2)
      ],
      LogLevel.Verbose
    )

    setCheckStatus?.(res.data?.status)

    if (res.status === 200 && res.data && res.data.status === 'failure') {
      throw Error('Transaction failed')
    }
    if (res.status === 200 && res.data && res.data.status === 'fallback') {
      throw Error('Transaction failed: Refunded')
    }
    if (res.status === 200 && res.data && res.data.status === 'pending') {
      // Extract origin txHashes if provided
      if (res.data.inTxHashes && res.data.inTxHashes.length > 0) {
        const depositTxHashes: NonNullable<
          Execute['steps'][0]['items']
        >[0]['txHashes'] = res.data.inTxHashes.map((hash: Address) => ({
          txHash: hash,
          chainId: res.data.originChainId ?? chainId,
          isBatchTx: isBatchTransaction
        }))
        setInternalTxHashes(depositTxHashes)
      }
      return false
    }
    if (res.status === 200 && res.data && res.data.status === 'submitted') {
      // Extract destination txHashes if provided
      if (res.data.txHashes && res.data.txHashes.length > 0) {
        const fillTxHashes: NonNullable<
          Execute['steps'][0]['items']
        >[0]['txHashes'] = res.data.txHashes.map((hash: Address) => ({
          txHash: hash,
          chainId: res.data.destinationChainId ?? crossChainIntentChainId
        }))
        setTxHashes(fillTxHashes)
      }

      // Extract origin txHashes if provided
      if (res.data.inTxHashes && res.data.inTxHashes.length > 0) {
        const depositTxHashes: NonNullable<
          Execute['steps'][0]['items']
        >[0]['txHashes'] = res.data.inTxHashes.map((hash: Address) => ({
          txHash: hash,
          chainId: res.data.originChainId ?? chainId,
          isBatchTx: isBatchTransaction
        }))
        setInternalTxHashes(depositTxHashes)
      }

      return false // Continue polling
    }
    if (res.status === 200 && res.data && res.data.status === 'success') {
      if (txHash) {
        setInternalTxHashes([
          { txHash: txHash, chainId: chainId, isBatchTx: isBatchTransaction }
        ])
      } else if (res?.data?.inTxHashes) {
        const depositTxHashes: NonNullable<
          Execute['steps'][0]['items']
        >[0]['txHashes'] = res.data?.inTxHashes?.map((hash: Address) => {
          return {
            txHash: hash,
            chainId: res?.data?.originChainId ?? chainId,
            isBatchTx: isBatchTransaction
          }
        })
        setInternalTxHashes(depositTxHashes)
      }

      const fillTxHashes: NonNullable<
        Execute['steps'][0]['items']
      >[0]['txHashes'] = res.data?.txHashes?.map((hash: Address) => {
        return {
          txHash: hash,
          chainId: res?.data?.destinationChainId ?? crossChainIntentChainId
        }
      })
      setTxHashes(fillTxHashes)

      setCheckStatus?.('success')

      return true
    }
    return false
  }

  // Poll the confirmation url to confirm the transaction went through
  const pollForConfirmation = async (receiptController?: AbortController) => {
    isValidating?.()

    // If websocket is enabled, wait for it to fail before falling back to polling
    if (onWebsocketFailed) {
      try {
        await onWebsocketFailed()
        client.log(['WebSocket failed, starting polling'], LogLevel.Verbose)
      } catch (e) {
        client.log(
          ['WebSocket failed promise rejected, skipping polling'],
          LogLevel.Verbose
        )
        return
      }
    }

    // Start polling
    while (
      waitingForConfirmation &&
      attemptCount < maximumAttempts &&
      !transactionCancelled &&
      !confirmationError
    ) {
      client.log(['Polling for confirmation'], LogLevel.Verbose)

      let res: AxiosResponse<any, any> | undefined
      if (check?.endpoint && !request?.data?.useExternalLiquidity) {
        let endpoint = check?.endpoint

        // Override v2 status endpoint to v3 to get 'submitted' status
        if (endpoint.includes('/intents/status') && !endpoint.includes('/v3')) {
          endpoint = endpoint.replace('/intents/status', '/intents/status/v3')
        }

        if (
          client.source &&
          !endpoint.includes('referrer') &&
          check?.method === 'GET'
        ) {
          endpoint = endpoint.includes('?')
            ? `${endpoint}&referrer=${client.source}`
            : `${endpoint}?referrer=${client.source}`
        }
        try {
          res = await axios.request({
            url: `${request.baseURL}${endpoint}`,
            method: check?.method,
            headers: headers
          })
        } catch (e) {
          getClient()?.log(
            ['Execute Steps: Polling for confirmation api error', e],
            LogLevel.Verbose
          )
          res = {
            data: {},
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {
              headers: {} as AxiosRequestHeaders
            }
          }
        }
      }

      if (res?.data?.status === 'pending' && waitingForConfirmation) {
        //we can now abort checking for the receipt as we know it's complete by the backend
        receiptController?.abort()
      }

      if (!res || validate(res)) {
        waitingForConfirmation = false // transaction confirmed
      } else if (res) {
        if (res.data.status !== 'pending') {
          isValidating?.(res)
          attemptCount++
        }

        await new Promise((resolve) => setTimeout(resolve, pollingInterval))
      }
    }

    if (attemptCount >= maximumAttempts) {
      if (receipt) {
        throw new SolverStatusTimeoutError(txHash as Address, attemptCount)
      } else {
        throw new DepositTransactionTimeoutError(
          txHash as Address,
          attemptCount
        )
      }
    }

    if (transactionCancelled) {
      throw Error('Transaction was cancelled')
    }

    return true
  }

  const waitForTransaction = () => {
    const controller = new AbortController()
    const signal = controller.signal

    return {
      promise: wallet
        .handleConfirmTransactionStep(
          txHash as string,
          chainId,
          (replacementTxHash) => {
            if (signal.aborted) {
              return
            }
            setTxHashes([{ txHash: replacementTxHash, chainId: chainId }])
            txHash = replacementTxHash
            attemptCount = 0 // reset attempt count
            getClient()?.log(
              ['Transaction replaced', replacementTxHash],
              LogLevel.Verbose
            )
            postTransactionToSolver({
              txHash: replacementTxHash,
              chainId,
              step,
              request,
              headers,
              source: client.source
            })

            if (
              !isBatchTransaction &&
              !Array.isArray(items) &&
              chainId === details?.currencyOut?.currency?.chainId
            ) {
              postSameChainTransactionToSolver({
                calldata: JSON.stringify({ ...items.data, replacementTxHash }),
                chainId,
                step,
                request,
                headers,
                source: client.source
              })
            }
          },
          () => {
            if (signal.aborted) {
              return
            }
            transactionCancelled = true
            getClient()?.log(['Transaction cancelled'], LogLevel.Verbose)
          }
        )
        .then((data) => {
          if (signal.aborted) {
            return
          }
          receipt = data
          setReceipt?.(receipt)
          if (
            receipt &&
            typeof receipt === 'object' &&
            'status' in receipt &&
            receipt.status === 'reverted'
          ) {
            throw 'Transaction Reverted'
          }
          getClient()?.log(
            ['Transaction Receipt obtained', receipt],
            LogLevel.Verbose
          )
        })
        .catch(async (error) => {
          if (signal.aborted) {
            return
          }

          let tenderlyError: TenderlyErrorInfo | null = null

          if (receipt && (receipt as TransactionReceipt).transactionHash) {
            tenderlyError = await getTenderlyDetails(
              chainId,
              (receipt as TransactionReceipt).transactionHash
            )
          }
          getClient()?.log(
            ['Error in handleConfirmTransactionStep', error],
            LogLevel.Error
          )
          if (error.message === 'Transaction cancelled') {
            transactionCancelled = true
          } else {
            confirmationError = true
            throw new TransactionConfirmationError(
              error,
              receipt,
              tenderlyError
            )
          }
        }),
      controller
    }
  }

  //If the origin chain is bitcoin, skip polling for confirmation, because the deposit will take too long
  if (chainId === 8253038) {
    return true
  }

  if (isBatchTransaction) {
    await pollForConfirmation() // Rely on the solver to confirm batch transactions
  } else if (
    //Sequence internal functions
    // We want synchronous execution in the following cases:
    // - Approval Signature step required first
    // - Bitcoin is the destination
    // - Canonical route used
    step.id === 'approve' ||
    details?.currencyOut?.currency?.chainId === 8253038 ||
    request?.data?.useExternalLiquidity
  ) {
    await waitForTransaction().promise
    //In the following cases we want to skip polling for confirmation:
    // - Bitcoin destination chain, we want to skip polling for confirmation as the block times are lengthy
    // - Canonical route, also lengthy fill time
    if (
      details?.currencyOut?.currency?.chainId !== 8253038 &&
      !request?.data?.useExternalLiquidity
    ) {
      await pollForConfirmation()
    }
  } else {
    const { promise: receiptPromise, controller: receiptController } =
      waitForTransaction()
    const confirmationPromise = pollForConfirmation(receiptController)

    await Promise.race([receiptPromise, confirmationPromise])
    const isSameChain = details?.currencyOut?.currency?.chainId === chainId

    if (waitingForConfirmation) {
      if (!isSameChain) {
        await confirmationPromise
      } else {
        waitingForConfirmation = false
        // For same chain transactions, mark as complete to prevent WebSocket polling fallback
        if (statusControl) {
          statusControl.lastKnownStatus = 'success'
        }
      }
    }

    if (!receipt) {
      if (!check) {
        await receiptPromise
      } else {
        receiptController.abort()
      }
    }
  }

  return true
}

const postSameChainTransactionToSolver = async ({
  calldata,
  chainId,
  request,
  headers,
  step,
  source
}: {
  calldata: string
  chainId: number
  step: Execute['steps'][0]
  request: AxiosRequestConfig
  headers?: AxiosRequestHeaders
  source?: string
}) => {
  if (calldata && step.requestId && chainId) {
    getClient()?.log(
      ['Posting same chain transaction to notify the solver'],
      LogLevel.Verbose
    )
    try {
      const triggerData: paths['/transactions/single']['post']['requestBody']['content']['application/json'] & {
        referrer?: string
      } = {
        tx: calldata,
        chainId: chainId.toString(),
        requestId: step.requestId,
        referrer: source
      }

      axios
        .request({
          url: `${request.baseURL}/transactions/single`,
          method: 'POST',
          headers: headers,
          data: triggerData
        })
        .then(() => {
          getClient()?.log(
            ['Same chain transaction notified to the solver'],
            LogLevel.Verbose
          )
        })
    } catch (e) {
      getClient()?.log(
        ['Failed to post same chain transaction to solver', e],
        LogLevel.Warn
      )
    }
  }
}

const postTransactionToSolver = async ({
  txHash,
  chainId,
  request,
  headers,
  step,
  source
}: {
  txHash: string | undefined
  chainId: number
  step: Execute['steps'][0]
  request: AxiosRequestConfig
  headers?: AxiosRequestHeaders
  source?: string
}) => {
  if (step.id === 'deposit' && txHash) {
    getClient()?.log(
      ['Posting transaction to notify the solver'],
      LogLevel.Verbose
    )
    try {
      const triggerData: NonNullable<
        paths['/transactions/index']['post']['requestBody']
      >['content']['application/json'] & { referrer?: string } = {
        txHash,
        chainId: chainId.toString(),
        referrer: source
      }

      axios
        .request({
          url: `${request.baseURL}/transactions/index`,
          method: 'POST',
          headers: headers,
          data: triggerData
        })
        .then(() => {
          getClient()?.log(
            ['Transaction notified to the solver'],
            LogLevel.Verbose
          )
        })
    } catch (e) {
      getClient()?.log(
        ['Failed to post transaction to solver', e],
        LogLevel.Warn
      )
    }
  }
}
