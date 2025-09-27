import type {
  Execute,
  AdaptedWallet,
  TransactionStepItem
} from '../../types/index.js'
import { sendTransactionSafely } from '../transaction.js'
import type { AxiosRequestConfig } from 'axios'
import { LogLevel } from '../logger.js'
import type { RelayClient } from '../../client.js'
import type { SetStateData } from './index.js'

/**
 * Handles the execution of a transaction step item, including transaction submission and validation.
 */
export async function handleTransactionStepItem({
  stepItem,
  step,
  wallet,
  setState,
  request,
  client,
  json,
  chainId,
  isAtomicBatchSupported,
  incompleteStepItemIndex,
  stepItems,
  onWebsocketFailed,
  statusControl
}: {
  stepItem: TransactionStepItem
  step: Execute['steps'][0]
  wallet: AdaptedWallet
  setState: (data: SetStateData) => void
  request: AxiosRequestConfig
  client: RelayClient
  json: Execute
  chainId: number
  isAtomicBatchSupported: boolean
  incompleteStepItemIndex: number
  stepItems: Execute['steps'][0]['items']
  onWebsocketFailed: (() => Promise<void>) | null
  statusControl?: { lastKnownStatus?: string }
}): Promise<void> {
  if (!stepItem.data) {
    throw `Step item is missing data`
  }

  client.log(
    ['Execute Steps: Begin transaction step for, sending transaction'],
    LogLevel.Verbose
  )

  // if chainId is present in the tx data field then you should relay the tx on that chain
  // otherwise, it's assumed the chain id matched the network the api request was made on
  const transactionChainId = stepItem.data?.chainId ?? chainId

  const crossChainIntentChainId = chainId
  stepItem.progressState = 'confirming'
  setState({
    steps: [...json.steps],
    fees: { ...json?.fees },
    breakdown: json?.breakdown,
    details: json?.details
  })

  // If atomic batch is supported and first item in step, batch all items in the step
  const transactionStepItems =
    isAtomicBatchSupported && incompleteStepItemIndex === 0
      ? stepItems
      : stepItem

  await sendTransactionSafely(
    transactionChainId,
    transactionStepItems as TransactionStepItem[],
    step,
    wallet,
    (txHashes) => {
      client.log(
        ['Execute Steps: Transaction step, got transactions', txHashes],
        LogLevel.Verbose
      )
      stepItem.txHashes = txHashes
      setState({
        steps: [...json.steps],
        fees: { ...json?.fees },
        breakdown: json?.breakdown,
        details: json?.details
      })
    },
    (internalTxHashes) => {
      stepItem.internalTxHashes = internalTxHashes
      setState({
        steps: [...json.steps],
        fees: { ...json?.fees },
        breakdown: json?.breakdown,
        details: json?.details
      })
    },
    onWebsocketFailed,
    request,
    undefined,
    crossChainIntentChainId,
    () => {
      stepItem.progressState = 'validating'
      setState({
        steps: [...json.steps],
        fees: { ...json?.fees },
        breakdown: json?.breakdown,
        details: json?.details
      })
    },
    json?.details,
    (receipt) => {
      stepItem.receipt = receipt
      setState({
        steps: [...json.steps],
        fees: { ...json?.fees },
        breakdown: json?.breakdown,
        details: json?.details
      })
    },
    (checkStatus) => {
      if (checkStatus != stepItem.checkStatus) {
        stepItem.checkStatus = checkStatus
        setState({
          steps: [...json.steps],
          fees: { ...json?.fees },
          breakdown: json?.breakdown,
          details: json?.details
        })
      }
    },
    statusControl
  )
}
