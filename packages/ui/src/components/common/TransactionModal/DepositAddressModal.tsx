import type { Execute, RelayChain } from '@relayprotocol/relay-sdk'
import { type Address } from 'viem'
import { type FC, useEffect } from 'react'
import {
  type ChildrenProps,
  DepositAddressModalRenderer,
  TransactionProgressStep
} from './DepositAddressModalRenderer.js'
import { Modal } from '../Modal.js'
import { Flex, Text } from '../../primitives/index.js'
import { ErrorStep } from './steps/ErrorStep.js'
import { EventNames } from '../../../constants/events.js'
import { type Token } from '../../../types/index.js'
import { SwapSuccessStep } from './steps/SwapSuccessStep.js'
import { formatBN } from '../../../utils/numbers.js'
import { extractQuoteId } from '../../../utils/quote.js'
import { WaitingForDepositStep } from './steps/WaitingForDepositStep.js'
import { DepositAddressValidatingStep } from './steps/DepositAddressValidatingStep.js'

type DepositAddressModalProps = {
  open: boolean
  fromChain?: RelayChain
  fromToken?: Token
  toToken?: Token
  address?: Address | string
  timeEstimate?: { time: number; formattedTime: string }
  debouncedOutputAmountValue: string
  debouncedInputAmountValue: string
  recipient?: Address | string
  customToAddress?: Address | string
  invalidateBalanceQueries: () => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onOpenChange: (open: boolean) => void
  onSuccess?: (data: Execute) => void
}

export const DepositAddressModal: FC<DepositAddressModalProps> = (
  depositAddressModalProps
) => {
  const {
    open,
    address,
    fromChain,
    fromToken,
    toToken,
    recipient,
    debouncedInputAmountValue,
    debouncedOutputAmountValue,
    onOpenChange,
    invalidateBalanceQueries,
    onAnalyticEvent,
    onSuccess
  } = depositAddressModalProps

  useEffect(() => {
    onOpenChange(open)
  }, [open])

  return (
    <DepositAddressModalRenderer
      open={open}
      fromChain={fromChain}
      fromToken={fromToken}
      toToken={toToken}
      debouncedInputAmountValue={debouncedInputAmountValue}
      debouncedOutputAmountValue={debouncedOutputAmountValue}
      address={address}
      recipient={recipient}
      invalidateBalanceQueries={invalidateBalanceQueries}
      onAnalyticEvent={onAnalyticEvent}
      onSuccess={(quote, executionStatus) => {
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
        const quoteId = quote
          ? extractQuoteId(quote?.steps as Execute['steps'])
          : undefined
        onAnalyticEvent?.(EventNames.SWAP_SUCCESS, {
          ...extraData,
          chain_id_in: fromToken?.chainId,
          currency_in: fromToken?.symbol,
          chain_id_out: toToken?.chainId,
          currency_out: toToken?.symbol,
          quote_id: quoteId,
          txHashes: [
            ...(executionStatus?.inTxHashes ?? []),
            ...(executionStatus?.txHashes ?? [])
          ],
          steps: quote?.steps
        })
        onSuccess?.({
          steps: quote?.steps as Execute['steps'],
          fees: fees,
          details: details
        })
      }}
    >
      {(rendererProps) => {
        return (
          <InnerDepositAddressModal
            address={address}
            onAnalyticEvent={onAnalyticEvent}
            {...depositAddressModalProps}
            {...rendererProps}
          />
        )
      }}
    </DepositAddressModalRenderer>
  )
}

type InnerDepositAddressModalProps = ChildrenProps & DepositAddressModalProps

const InnerDepositAddressModal: FC<InnerDepositAddressModalProps> = ({
  open,
  onOpenChange,
  fromToken,
  toToken,
  quote,
  isFetchingQuote,
  quoteError,
  address,
  swapError,
  progressStep,
  allTxHashes,
  transaction,
  timeEstimate,
  fillTime,
  seconds,
  fromChain,
  toChain,
  recipient,
  depositAddress,
  executionStatus,
  isLoadingTransaction,
  requestId
}) => {
  const details = quote?.details

  const fromAmountFormatted = details?.currencyIn?.amount
    ? formatBN(details?.currencyIn?.amount, 6, fromToken?.decimals, false)
    : ''
  const toAmountFormatted = details?.currencyOut?.amount
    ? formatBN(details?.currencyOut.amount, 6, toToken?.decimals, false)
    : ''

  const isWaitingForDeposit =
    progressStep === TransactionProgressStep.WaitingForDeposit

  return (
    <Modal
      trigger={null}
      open={open}
      onOpenChange={onOpenChange}
      className="relay-overflow-hidden relay-p-4 !relay-max-w-[412px]"
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
        className={`relay-w-full relay-h-full ${isWaitingForDeposit ? 'relay-gap-3' : 'relay-gap-4'}`}
      >
        <Text style="h6" className="relay-mb-2">
          {isWaitingForDeposit ? 'Manual Transfer' : 'Trade Details'}
        </Text>

        {progressStep === TransactionProgressStep.WaitingForDeposit ? (
          <WaitingForDepositStep
            fromToken={fromToken}
            fromChain={fromChain}
            fromAmountFormatted={fromAmountFormatted}
            isFetchingQuote={isFetchingQuote}
            depositAddress={depositAddress}
          />
        ) : null}

        {progressStep === TransactionProgressStep.Validating ? (
          <DepositAddressValidatingStep
            status={executionStatus?.status}
            txHashes={executionStatus?.txHashes ?? []}
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
            fillTime={fillTime}
            seconds={seconds ?? 0}
            onOpenChange={onOpenChange}
            timeEstimate={timeEstimate?.formattedTime}
            details={details}
            isLoadingTransaction={isLoadingTransaction}
            requestId={requestId}
          />
        ) : null}
        {progressStep === TransactionProgressStep.Error ? (
          <ErrorStep
            error={swapError || quoteError}
            allTxHashes={allTxHashes}
            address={address}
            onOpenChange={onOpenChange}
            transaction={transaction}
            fromChain={fromChain}
            toChain={toChain}
            fromToken={fromToken}
            toToken={toToken}
            fromAmountFormatted={fromAmountFormatted}
            toAmountFormatted={toAmountFormatted}
          />
        ) : null}
      </Flex>
    </Modal>
  )
}
