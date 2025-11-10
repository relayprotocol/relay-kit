import {
  type FC,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
  type SetStateAction,
  type Dispatch
} from 'react'
import { type Address } from 'viem'
import {
  type AdaptedWallet,
  type Execute,
  type ExecuteStep,
  type ExecuteStepItem
} from '@relayprotocol/relay-sdk'
import {
  calculateFillTime,
  extractDepositRequestId
} from '../../../utils/relayTransaction.js'
import type { Token } from '../../../types/index.js'
import { useRequests } from '@relayprotocol/relay-kit-hooks'
import { useRelayClient } from '../../../hooks/index.js'
import {
  calculatePriceTimeEstimate,
  isGasSponsored
} from '../../../utils/quote.js'
export enum TransactionProgressStep {
  Confirmation,
  Submitted,
  Success,
  Error
}

export type TxHashes = {
  txHash: string
  chainId: number
  isBatchTx?: boolean
}[]

export type ChildrenProps = {
  wallet?: AdaptedWallet
  progressStep: TransactionProgressStep
  setProgressStep: Dispatch<SetStateAction<TransactionProgressStep>>
  currentStep?: ExecuteStep | null
  setCurrentStep: Dispatch<SetStateAction<ExecuteStep | undefined | null>>
  currentStepItem: ExecuteStepItem | null | undefined
  setCurrentStepItem: Dispatch<
    SetStateAction<ExecuteStepItem | null | undefined>
  >
  quote: Execute | null
  swapError: Error | null
  setSwapError: Dispatch<SetStateAction<Error | null>>
  steps: Execute['steps'] | null
  waitingForSteps: boolean
  allTxHashes: TxHashes
  setAllTxHashes: Dispatch<SetStateAction<TxHashes>>
  transaction: ReturnType<typeof useRequests>['data']['0']
  seconds: number
  fillTime: string
  requestId: string | null
  isLoadingTransaction: boolean
  isAutoSlippage: boolean
  timeEstimate?: { time: number; formattedTime: string }
  isGasSponsored: boolean
  currentCheckStatus?: ExecuteStepItem['checkStatus']
}

type Props = {
  open: boolean
  address?: Address | string
  fromToken?: Token
  toToken?: Token
  slippageTolerance?: string
  wallet?: AdaptedWallet
  steps: Execute['steps'] | null
  quote: Execute | null
  swapError: Error | null
  setSwapError: Dispatch<SetStateAction<Error | null>>
  children: (props: ChildrenProps) => ReactNode
  onSuccess?: (quote: Execute, steps: Execute['steps']) => void
  onValidating?: (quote: Execute) => void
}

export const TransactionModalRenderer: FC<Props> = ({
  open,
  slippageTolerance,
  wallet,
  steps,
  quote,
  swapError,
  setSwapError,
  children,
  onSuccess,
  onValidating
}) => {
  const relayClient = useRelayClient()
  const chainId = quote?.details?.currencyIn?.currency?.chainId || 1

  const [progressStep, setProgressStep] = useState(
    TransactionProgressStep.Confirmation
  )
  const [currentStep, setCurrentStep] = useState<
    null | NonNullable<Execute['steps']>['0']
  >()
  const [currentStepItem, setCurrentStepItem] = useState<
    null | NonNullable<NonNullable<Execute['steps']>['0']['items']>['0']
  >()
  const [allTxHashes, setAllTxHashes] = useState<TxHashes>([])
  const [waitingForSteps, setWaitingForSteps] = useState(false)
  const [hasStartedValidation, setHasStartedValidation] = useState(false)
  const [lastCheckStatus, setLastCheckStatus] = useState<
    ExecuteStepItem['checkStatus'] | undefined
  >()

  useEffect(() => {
    if (!open) {
      setHasStartedValidation(false)
    }
  }, [open])

  useEffect(() => {
    if (swapError) {
      setProgressStep(TransactionProgressStep.Error)
      return
    }
    if (!steps) {
      return
    }

    const executableSteps = steps.filter(
      (step) => step.items && step.items.length > 0
    )

    let stepCount = executableSteps.length
    let txHashes: TxHashes = []
    let currentStep: NonNullable<Execute['steps']>['0'] | null = null
    let currentStepItem:
      | NonNullable<Execute['steps'][0]['items']>[0]
      | undefined

    for (const step of executableSteps) {
      for (const item of step.items || []) {
        if (item.txHashes && item.txHashes.length > 0) {
          txHashes = item.txHashes.concat([...txHashes])
        }
        if (item.internalTxHashes && item.internalTxHashes.length > 0) {
          txHashes = item.internalTxHashes.concat([...txHashes])
        }
        if (item.status === 'incomplete') {
          currentStep = step
          currentStepItem = item

          break // Exit the inner loop once the first incomplete item is found
        }
      }
      if (currentStep && currentStepItem) break // Exit the outer loop if the current step and item have been found
    }

    setAllTxHashes(txHashes)

    if (
      !hasStartedValidation &&
      (txHashes.length > 0 || currentStepItem?.isValidatingSignature == true) &&
      progressStep === TransactionProgressStep.Confirmation
    ) {
      onValidating?.(quote as Execute)
      setHasStartedValidation(true)
    }

    if (!currentStep) {
      currentStep = executableSteps[stepCount - 1]
    }

    setCurrentStep(currentStep)
    setCurrentStepItem(currentStepItem)

    const isBitcoinDestination =
      quote?.details?.currencyOut?.currency?.chainId === 8253038

    if (isBitcoinDestination && currentStepItem?.checkStatus) {
      setLastCheckStatus(currentStepItem.checkStatus)
    }

    const allStepsComplete = steps.every(
      (step) =>
        !step.items ||
        step.items.length == 0 ||
        step.items?.every((item) => {
          if (isBitcoinDestination && item.checkStatus === 'submitted') {
            return true
          }
          return item.status === 'complete'
        })
    )

    const hasPendingItems = steps.some((step) =>
      step.items?.some((item) => item.checkStatus === 'pending')
    )

    const hasSubmittedItems = steps.some((step) =>
      step.items?.some((item) => item.checkStatus === 'submitted')
    )

    // Check if any step items are still validating
    const hasValidatingItems = steps.some((step) =>
      step.items?.some(
        (item) =>
          item.isValidatingSignature === true ||
          item.progressState === 'validating'
      )
    )

    // Transition to Submitted state when items are pending or submitted
    if (
      (hasPendingItems || hasSubmittedItems) &&
      progressStep === TransactionProgressStep.Confirmation &&
      !hasValidatingItems
    ) {
      setProgressStep(TransactionProgressStep.Submitted)
      onValidating?.(quote as Execute)
    }

    // Only show success if all steps are complete
    if (allStepsComplete && progressStep !== TransactionProgressStep.Success) {
      setProgressStep(TransactionProgressStep.Success)
      onSuccess?.(quote as Execute, steps)
    }
  }, [steps, swapError])

  const requestId = useMemo(() => extractDepositRequestId(steps), [steps])

  // Fetch Success Tx
  const { data: transactions, isInitialLoading: isLoadingTransaction } =
    useRequests(
      (progressStep === TransactionProgressStep.Success ||
        progressStep === TransactionProgressStep.Error) &&
        requestId
        ? { id: requestId }
        : undefined,
      relayClient?.baseApiUrl,
      {
        enabled:
          (progressStep === TransactionProgressStep.Success ||
            progressStep === TransactionProgressStep.Error) &&
          (requestId || allTxHashes[0])
            ? true
            : false,
        refetchInterval(query) {
          if (query.state.dataUpdateCount > 10) {
            return 0
          }
          const transaction = query.state.data?.pages[0].requests?.[0]
          if (!transaction) {
            return 2500
          }
          // If this is a refund but outTxs is not populated yet, keep polling
          const isRefund =
            transaction.status === 'refund' ||
            transaction.data?.refundCurrencyData
          if (
            isRefund &&
            (!transaction.data?.outTxs || transaction.data.outTxs.length === 0)
          ) {
            return 2500
          }
          return 0
        }
      }
    )
  const transaction = transactions[0]
  const { fillTime, seconds } = calculateFillTime(transaction)

  const isAutoSlippage = slippageTolerance === undefined
  const timeEstimate = calculatePriceTimeEstimate(quote?.details)
  const _isGasSponsored = isGasSponsored(quote as Execute)

  const isBitcoinDestination =
    quote?.details?.currencyOut?.currency?.chainId === 8253038

  let effectiveCheckStatus = currentStepItem?.checkStatus
  if (
    !effectiveCheckStatus &&
    isBitcoinDestination &&
    progressStep === TransactionProgressStep.Success
  ) {
    const lastCompletedStep = steps?.find((step) =>
      step.items?.some((item) => item.status === 'complete' && item.checkStatus)
    )
    const lastCompletedItem = lastCompletedStep?.items?.find(
      (item) => item.status === 'complete' && item.checkStatus
    )
    effectiveCheckStatus = lastCompletedItem?.checkStatus || lastCheckStatus
  }

  return (
    <>
      {children({
        wallet,
        progressStep,
        setProgressStep,
        currentStep,
        setCurrentStep,
        currentStepItem,
        setCurrentStepItem,
        quote,
        steps,
        waitingForSteps,
        swapError,
        setSwapError,
        allTxHashes,
        setAllTxHashes,
        transaction,
        fillTime,
        seconds,
        requestId,
        isLoadingTransaction,
        isAutoSlippage,
        timeEstimate,
        isGasSponsored: _isGasSponsored,
        currentCheckStatus: effectiveCheckStatus
      })}
    </>
  )
}
