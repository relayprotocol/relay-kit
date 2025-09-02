import type {
  AdaptedWallet,
  Execute,
  RelayChain
} from '@relayprotocol/relay-sdk'
import { type Address } from 'viem'
import { type Dispatch, type FC, type SetStateAction, useEffect } from 'react'
import {
  type ChildrenProps,
  TransactionModalRenderer,
  TransactionProgressStep
} from './TransactionModalRenderer.js'
import { Modal } from '../Modal.js'
import { Flex, Text } from '../../primitives/index.js'
import { ErrorStep } from './steps/ErrorStep.js'
import { EventNames } from '../../../constants/events.js'
import { SwapConfirmationStep } from './steps/SwapConfirmationStep.js'
import { type Token } from '../../../types/index.js'
import { SwapSuccessStep } from './steps/SwapSuccessStep.js'
import { formatBN } from '../../../utils/numbers.js'
import { extractQuoteId } from '../../../utils/quote.js'
import type { LinkedWallet } from '../../../types/index.js'

type TransactionModalProps = {
  open: boolean
  fromChain?: RelayChain
  toChain?: RelayChain
  fromToken?: Token
  toToken?: Token
  address?: Address | string
  isCanonical?: boolean
  useExternalLiquidity: boolean
  slippageTolerance?: string
  wallet?: AdaptedWallet
  linkedWallets?: LinkedWallet[]
  multiWalletSupportEnabled?: boolean
  steps: Execute['steps'] | null
  setSteps: Dispatch<SetStateAction<Execute['steps'] | null>>
  setQuote: Dispatch<SetStateAction<null | Execute>>
  quote: Execute | null
  swapError: Error | null
  setSwapError: Dispatch<SetStateAction<Error | null>>
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onOpenChange: (open: boolean) => void
  onSuccess?: (data: Execute) => void
  onSwapValidating?: (data: Execute) => void
  invalidateQuoteQuery: () => void
}

export const TransactionModal: FC<TransactionModalProps> = (
  transactionModalProps
) => {
  const {
    quote,
    steps,
    swapError,
    setSwapError,
    open,
    address,
    fromToken,
    toToken,
    useExternalLiquidity,
    slippageTolerance,
    isCanonical,
    wallet,
    onOpenChange,
    onAnalyticEvent,
    onSuccess,
    onSwapValidating
  } = transactionModalProps

  useEffect(() => {
    onOpenChange(open)
  }, [open])

  return (
    <TransactionModalRenderer
      open={open}
      fromToken={fromToken}
      toToken={toToken}
      quote={quote}
      steps={steps}
      swapError={swapError}
      setSwapError={setSwapError}
      slippageTolerance={slippageTolerance}
      address={address}
      wallet={wallet}
      onValidating={(quote) => {
        const steps = quote?.steps
        const details = quote?.details
        const fees = quote?.fees
        onSwapValidating?.({
          steps: steps,
          fees: fees,
          details: details
        })
      }}
      onSuccess={(quote, steps) => {
        const details = quote?.details
        const fees = quote?.fees

        const extraData: {
          gas_fee?: number
          relayer_fee?: number
          amount_in: number
          amount_out: number
        } = {
          amount_in: parseFloat(`${details?.currencyIn?.amountFormatted}`),
          amount_out: parseFloat(`${details?.currencyOut?.amountFormatted}`)
        }
        if (fees?.gas?.amountFormatted) {
          extraData.gas_fee = parseFloat(fees.gas.amountFormatted)
        }
        if (fees?.relayer?.amountFormatted) {
          extraData.relayer_fee = parseFloat(fees.relayer.amountFormatted)
        }
        const quoteId = steps ? extractQuoteId(steps) : undefined
        onAnalyticEvent?.(EventNames.SWAP_SUCCESS, {
          ...extraData,
          chain_id_in: fromToken?.chainId,
          currency_in: fromToken?.symbol,
          chain_id_out: toToken?.chainId,
          currency_out: toToken?.symbol,
          currency_in_usd: details?.currencyIn?.amountUsd,
          currency_out_usd: details?.currencyOut?.amountUsd,
          is_canonical: useExternalLiquidity,
          quote_id: quoteId,
          txHashes: steps
            ?.map((step) => {
              let txHashes: { chainId: number; txHash: string }[] = []
              step.items?.forEach((item) => {
                if (item.txHashes) {
                  txHashes = txHashes.concat([
                    ...(item.txHashes ?? []),
                    ...(item.internalTxHashes ?? [])
                  ])
                }
              })
              return txHashes
            })
            .flat(),
          steps
        })
        onSuccess?.({
          steps: steps,
          fees: fees,
          details: details
        })
      }}
    >
      {(rendererProps) => {
        return (
          <InnerTransactionModal
            address={address}
            onAnalyticEvent={onAnalyticEvent}
            isCanonical={isCanonical}
            {...transactionModalProps}
            {...rendererProps}
          />
        )
      }}
    </TransactionModalRenderer>
  )
}

type InnerTransactionModalProps = ChildrenProps & TransactionModalProps

const InnerTransactionModal: FC<InnerTransactionModalProps> = ({
  open,
  onOpenChange,
  fromToken,
  toToken,
  quote,
  address,
  swapError,
  setSwapError,
  progressStep,
  setProgressStep,
  steps,
  setSteps,
  currentStep,
  setCurrentStep,
  setCurrentStepItem,
  allTxHashes,
  setAllTxHashes,
  transaction,
  executionTime,
  executionTimeSeconds,
  setStartTimestamp,
  onAnalyticEvent,
  timeEstimate,
  isCanonical,
  fromChain,
  toChain,
  isLoadingTransaction,
  setQuote,
  requestId,
  isGasSponsored
}) => {
  useEffect(() => {
    if (!open) {
      if (currentStep) {
        onAnalyticEvent?.(EventNames.SWAP_MODAL_CLOSED)
      }
      setCurrentStep(null)
      setCurrentStepItem(null)
      setAllTxHashes([])
      setStartTimestamp(0)
      setSwapError(null)
      setSteps(null)
      setQuote(null)
    } else {
      setProgressStep(TransactionProgressStep.Confirmation)
      onAnalyticEvent?.(EventNames.SWAP_MODAL_OPEN)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const details = quote?.details

  const fromAmountFormatted = details?.currencyIn?.amount
    ? formatBN(details?.currencyIn?.amount, 6, fromToken?.decimals, false)
    : ''
  const toAmountFormatted = details?.currencyOut?.amount
    ? formatBN(details?.currencyOut.amount, 6, toToken?.decimals, false)
    : ''

  return (
    <Modal
      trigger={null}
      open={open}
      onOpenChange={onOpenChange}
      css={{
        overflow: 'hidden',
        p: '4',
        maxWidth: '412px !important',
        '@media(max-width: 520px)': {
          maxWidth: 'unset !important'
        }
      }}
      showCloseButton={true}
      onPointerDownOutside={(e) => {
        const dynamicModalElements = Array.from(
          document.querySelectorAll('#dynamic-send-transaction')
        )
        const clickedInsideDynamicModal = dynamicModalElements.some((el) =>
          e.target ? el.contains(e.target as Node) : false
        )

        if (clickedInsideDynamicModal && dynamicModalElements.length > 0) {
          e.preventDefault()
        }
      }}
    >
      <Flex
        direction="column"
        css={{
          width: '100%',
          height: '100%',
          gap: '3'
        }}
      >
        <Text style="h6" css={{ mb: 8 }}>
          Transaction Details
        </Text>
        {progressStep === TransactionProgressStep.Confirmation ? (
          <SwapConfirmationStep
            fromToken={fromToken}
            toToken={toToken}
            fromChain={fromChain}
            toChain={toChain}
            fromAmountFormatted={fromAmountFormatted}
            toAmountFormatted={toAmountFormatted}
            quote={quote}
            steps={steps}
          />
        ) : null}
        {progressStep === TransactionProgressStep.Success ? (
          <SwapSuccessStep
            fromToken={fromToken}
            toToken={toToken}
            fromAmountFormatted={fromAmountFormatted}
            toAmountFormatted={toAmountFormatted}
            allTxHashes={allTxHashes}
            transaction={transaction}
            fillTime={executionTime ?? ''}
            seconds={executionTimeSeconds ?? 0}
            onOpenChange={onOpenChange}
            timeEstimate={timeEstimate?.formattedTime}
            isCanonical={isCanonical}
            details={details}
            isLoadingTransaction={isLoadingTransaction}
            requestId={requestId}
            isGasSponsored={isGasSponsored}
          />
        ) : null}
        {progressStep === TransactionProgressStep.Error ? (
          <ErrorStep
            error={swapError}
            allTxHashes={allTxHashes}
            address={address}
            onOpenChange={onOpenChange}
            transaction={transaction}
            fromChain={fromChain}
            toChain={toChain}
          />
        ) : null}
      </Flex>
    </Modal>
  )
}
