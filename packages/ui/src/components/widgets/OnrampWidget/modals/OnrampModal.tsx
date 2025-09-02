import {
  getDeadAddress,
  LogLevel,
  type Execute,
  type paths,
  type RelayChain
} from '@relayprotocol/relay-sdk'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from '../../../common/Modal.js'
import type { FiatCurrency, Token } from '../../../../types/index.js'
import useRelayClient from '../../../../hooks/useRelayClient.js'
import { EventNames } from '../../../../constants/events.js'
import {
  useExecutionStatus,
  useQuote,
  useRequests,
  useTokenPrice
} from '@relayprotocol/relay-kit-hooks'
import { extractDepositRequestId } from '../../../../utils/relayTransaction.js'
import { parseUnits, zeroAddress } from 'viem'
import {
  appendMetadataToRequest,
  extractDepositAddress
} from '../../../../utils/quote.js'
import { getTxBlockExplorerUrl } from '../../../../utils/getTxBlockExplorerUrl.js'
import { OnrampConfirmingStep } from './steps/OnrampConfirmingStep.js'
import { OnrampProcessingStepUI } from './steps/OnrampProcessingStepUI.js'
import { OnrampProcessingPassthroughStep } from './steps/OnrampProcessingPassthroughStep.js'
import { OnrampSuccessStep } from './steps/OnrampSuccessStep.js'
import { OnrampMoonPayStep } from './steps/OnrampMoonPayStep.js'
import { formatBN } from '../../../../utils/numbers.js'
import { ErrorStep } from '../../../common/TransactionModal/steps/ErrorStep.js'
import { errorToJSON } from '../../../../utils/errors.js'
import { useAccount } from 'wagmi'
import { mainnet } from 'viem/chains'

export enum OnrampStep {
  Confirming,
  Moonpay,
  Processing,
  ProcessingPassthrough,
  Success,
  Error
}

export enum OnrampProcessingStep {
  Finalizing,
  Relaying
}

type OnrampModalProps = {
  open: boolean
  amount?: string
  amountFormatted?: string
  amountToTokenFormatted?: string
  fromToken: Token
  fromChain?: RelayChain
  toToken: Token
  toChain?: RelayChain
  fiatCurrency: FiatCurrency
  recipient?: string
  isPassthrough?: boolean
  moonPayCurrencyCode?: string
  usdRate?: number
  moonPayThemeId?: string
  moonPayThemeMode?: 'dark' | 'light'
  moonPayApiKey?: string
  moonpayOnUrlSignatureRequested: (url: string) => Promise<string> | void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onOpenChange: (open: boolean) => void
  onSuccess?: (data: Execute, moonpayRequestId: string) => void
  onError?: (error: string, data?: Execute, moonpayRequestId?: string) => void
}

type TxHashes = { txHash: string; chainId: number }[]

export const OnrampModal: FC<OnrampModalProps> = ({
  open,
  amount,
  amountFormatted,
  recipient,
  fromToken,
  toToken,
  toChain,
  fromChain,
  fiatCurrency,
  isPassthrough,
  amountToTokenFormatted,
  moonPayCurrencyCode,
  usdRate,
  moonPayThemeId,
  moonPayThemeMode,
  moonPayApiKey,
  moonpayOnUrlSignatureRequested,
  onAnalyticEvent,
  onSuccess,
  onError,
  onOpenChange
}) => {
  const [swapError, setSwapError] = useState<Error | null>(null)
  const [step, setStep] = useState<OnrampStep>(OnrampStep.Confirming)
  const [processingStep, setProcessingStep] = useState<
    OnrampProcessingStep | undefined
  >()
  const [moonPayRequestId, setMoonPayRequestId] = useState<string | undefined>()
  const client = useRelayClient()
  const { connector } = useAccount()
  const [moonPayIdAppended, setMoonPayIdAppended] = useState(false)
  const { data: ethTokenPriceResponse } = useTokenPrice(
    client?.baseApiUrl,
    {
      address: zeroAddress,
      chainId: mainnet.id,
      referrer: client?.source
    },
    {
      refetchInterval: 60000 * 5, //5 minutes
      refetchOnWindowFocus: false
    }
  )
  const [passthroughExternalId, setPassthroughExternalId] = useState<
    string | undefined
  >()

  useEffect(() => {
    if (!open) {
      setStep(OnrampStep.Confirming)
      setProcessingStep(undefined)
      setMoonPayRequestId(undefined)
      setMoonPayIdAppended(false)
      setSwapError(null)
      setPassthroughExternalId(undefined)
    } else {
      if (isPassthrough) {
        setStep(OnrampStep.Moonpay)
        setPassthroughExternalId(
          `${recipient ? recipient.slice(recipient.length - 5) : ''}${Date.now()}`
        )
      }
      onAnalyticEvent?.(EventNames.ONRAMP_MODAL_OPEN, {
        isPassthrough
      })
    }
  }, [open])

  const ethAmount =
    ethTokenPriceResponse && ethTokenPriceResponse.price
      ? +(amount ?? '0') / ethTokenPriceResponse.price
      : 0

  const {
    data: quote,
    error: quoteError,
    isFetching: isFetchingQuote
  } = useQuote(
    client ?? undefined,
    undefined,
    {
      originChainId: fromToken.chainId,
      originCurrency: fromToken.address,
      destinationChainId: toToken.chainId,
      destinationCurrency: toToken.address,
      useDepositAddress: true,
      tradeType: 'EXACT_INPUT',
      amount:
        fromToken.symbol === 'USDC'
          ? parseUnits(`${amount}`, 6).toString()
          : parseUnits(`${ethAmount}`, fromToken.decimals).toString(),
      user: getDeadAddress(),
      recipient
    },
    undefined,
    undefined,
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: Boolean(
        amount &&
          amount.length > 0 &&
          toToken &&
          fromToken &&
          !isPassthrough &&
          recipient !== undefined &&
          open
      )
    }
  )

  const totalAmount =
    quote?.fees && amount && !isPassthrough
      ? `${
          Math.floor(
            (Number(quote.fees.relayer?.amountUsd ?? 0) +
              Number(quote.fees.gas?.amountUsd ?? 0) +
              Number(quote.fees.app?.amountUsd ?? 0) +
              +amount) *
              100
          ) / 100
        }`
      : amount
  const ethTotalAmount = formatBN(
    totalAmount ? +totalAmount / (ethTokenPriceResponse?.price ?? 0) : 0,
    5,
    18
  )
  const toTokenTotalAmount = formatBN(
    +(totalAmount ?? '0') / (usdRate ?? 0),
    5,
    toToken.decimals
  )

  const depositAddress = useMemo(
    () => extractDepositAddress(quote?.steps as Execute['steps']),
    [quote]
  )

  const baseTransactionUrl = client?.baseApiUrl.includes('testnets')
    ? 'https://testnets.relay.link'
    : 'https://relay.link'

  const requestId = useMemo(
    () => extractDepositRequestId(quote?.steps as Execute['steps']),
    [quote]
  )

  const { data: executionStatus } = useExecutionStatus(
    client ? client : undefined,
    {
      requestId: requestId ?? undefined,
      referrer: client?.source
    },
    undefined,
    undefined,
    {
      enabled: requestId !== null && step === OnrampStep.Processing && open,
      refetchInterval(query) {
        const observableStates = ['waiting', 'pending', 'delayed']

        if (
          !query.state.data?.status ||
          (requestId && observableStates.includes(query.state.data?.status))
        ) {
          return 1000
        }
        return 0
      }
    }
  )

  const fillTxHash = useMemo(() => {
    if (executionStatus?.txHashes && executionStatus?.txHashes[0]) {
      return executionStatus?.txHashes[0]
    }
  }, [executionStatus])

  const { data: transactions, isLoading: isLoadingTransaction } = useRequests(
    step === OnrampStep.Success && fillTxHash
      ? {
          user: recipient,
          hash: fillTxHash
        }
      : undefined,
    client?.baseApiUrl,
    {
      enabled: Boolean(step === OnrampStep.Success && fillTxHash),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      retryOnMount: false
    }
  )

  const transaction = transactions && transactions[0] ? transactions[0] : null
  const toAmountFormatted = transaction?.data?.metadata?.currencyOut
    ?.amountFormatted
    ? (formatBN(
        +transaction.data.metadata.currencyOut.amountFormatted,
        5,
        transaction?.data?.metadata?.currencyOut?.currency?.decimals ?? 18
      ) ?? undefined)
    : amountToTokenFormatted

  const fillTxUrl = fillTxHash
    ? getTxBlockExplorerUrl(toToken.chainId, client?.chains, fillTxHash)
    : undefined

  const moonpayTxUrl = moonPayRequestId
    ? `https://buy.moonpay.com/transaction_receipt?transactionId=${moonPayRequestId}`
    : null

  useEffect(() => {
    if (
      executionStatus?.status === 'pending' &&
      (step !== OnrampStep.Processing ||
        processingStep !== OnrampProcessingStep.Relaying)
    ) {
      setStep(OnrampStep.Processing)
      setProcessingStep(OnrampProcessingStep.Relaying)
    }
    if (executionStatus?.status === 'success') {
      setStep(OnrampStep.Success)
      onAnalyticEvent?.(EventNames.ONRAMP_SUCCESS, {
        chain_id_in: fromToken?.chainId,
        currency_in: fromToken?.symbol,
        chain_id_out: toToken?.chainId,
        currency_out: toToken?.symbol,
        quote_id: requestId,
        txHashes: executionStatus.txHashes,
        amount,
        totalAmount,
        ethTotalAmount,
        moonPayRequestId,
        isPassthrough
      })
      onSuccess?.(quote as Execute, moonPayRequestId as string)
      setProcessingStep(undefined)
    }
    if (
      executionStatus?.status === 'failure' ||
      executionStatus?.status === 'refund' ||
      quoteError
    ) {
      const swapError = new Error(
        executionStatus?.details ??
          'Oops! Something went wrong while processing your transaction.'
      )
      onOnrampError(
        errorToJSON(executionStatus?.details ?? quoteError),
        swapError
      )
    }
  }, [executionStatus, quoteError])

  useEffect(() => {
    if (
      moonPayRequestId &&
      quote &&
      executionStatus?.inTxHashes &&
      executionStatus?.inTxHashes[0] &&
      !moonPayIdAppended
    ) {
      setMoonPayIdAppended(true)
      appendMetadataToRequest(
        client?.baseApiUrl,
        `${requestId}`,
        {
          moonPayId: moonPayRequestId
        },
        client?.source
      )
        ?.then(() => {
          client?.log(
            ['Posting MoonPay request id', moonPayRequestId, requestId],
            LogLevel.Verbose
          )
        })
        .catch((e) => {
          setMoonPayIdAppended(false)
          throw e
        })
    }
  }, [moonPayRequestId, executionStatus])

  const allTxHashes = useMemo(() => {
    const isRefund = executionStatus?.status === 'refund'
    const _allTxHashes: TxHashes = []
    executionStatus?.txHashes?.forEach((txHash) => {
      _allTxHashes.push({
        txHash,
        chainId: isRefund
          ? (fromToken?.chainId as number)
          : (toToken?.chainId as number)
      })
    })

    executionStatus?.inTxHashes?.forEach((txHash) => {
      _allTxHashes.push({
        txHash,
        chainId: fromToken?.chainId as number
      })
    })
    return _allTxHashes
  }, [executionStatus?.txHashes, executionStatus?.inTxHashes])

  const onOnrampError = useCallback(
    (errorMsg: any, error: Error) => {
      if (step !== OnrampStep.Error) {
        onError?.(error.message, quote as Execute, moonPayRequestId)
      }
      setStep(OnrampStep.Error)
      onAnalyticEvent?.(EventNames.ONRAMP_ERROR, {
        error_message: errorMsg,
        wallet_connector: connector?.name,
        quote_id: requestId,
        amount_in: amount,
        currency_in: fromToken?.symbol,
        chain_id_in: fromToken?.chainId,
        amount_out: quote?.details?.currencyOut?.amountFormatted,
        currency_out: toToken?.symbol,
        chain_id_out: toToken?.chainId,
        txHashes: executionStatus?.txHashes ?? []
      })
      setSwapError(error)
    },
    [
      executionStatus,
      connector,
      requestId,
      quote,
      toToken,
      fromToken,
      amount,
      swapError,
      moonPayRequestId,
      step
    ]
  )

  return (
    <Modal
      trigger={null}
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          onAnalyticEvent?.(EventNames.ONRAMP_MODAL_CLOSE)
        }
        onOpenChange(open)
      }}
      css={{
        overflow: 'hidden',
        p: '4',
        maxWidth: '412px !important',
        '@media(max-width: 520px)': {
          maxWidth: 'unset !important'
        }
      }}
    >
      {step === OnrampStep.Confirming ? (
        <OnrampConfirmingStep
          toToken={toToken}
          fromToken={fromToken}
          fromChain={fromChain}
          toChain={toChain}
          requestId={requestId ?? undefined}
          depositAddress={depositAddress}
          recipient={recipient}
          amount={amount}
          totalAmount={totalAmount ?? undefined}
          ethTotalAmount={ethTotalAmount}
          isFetchingQuote={isFetchingQuote}
          onAnalyticEvent={onAnalyticEvent}
          setStep={setStep}
        />
      ) : null}
      <OnrampMoonPayStep
        step={step}
        processingStep={processingStep}
        toToken={toToken}
        fromToken={fromToken}
        fromChain={fromChain}
        toChain={toChain}
        recipient={recipient}
        depositAddress={depositAddress}
        totalAmount={
          isPassthrough
            ? toTokenTotalAmount
            : fromToken.symbol === 'ETH'
              ? ethTotalAmount
              : (totalAmount ?? undefined)
        }
        fiatCurrency={fiatCurrency}
        isPassthrough={isPassthrough}
        moonPayCurrencyCode={moonPayCurrencyCode}
        onAnalyticEvent={onAnalyticEvent}
        setStep={setStep}
        setProcessingStep={setProcessingStep}
        setMoonPayRequestId={setMoonPayRequestId}
        moonpayOnUrlSignatureRequested={moonpayOnUrlSignatureRequested}
        onPassthroughSuccess={() => {
          setStep(OnrampStep.Success)
          onAnalyticEvent?.(EventNames.ONRAMP_PASSTHROUGH_SUCCESS, {
            moonPayRequestId,
            amount,
            totalAmount,
            ethTotalAmount
          })
        }}
        moonPayThemeId={moonPayThemeId}
        moonPayThemeMode={moonPayThemeMode}
        moonPayApiKey={moonPayApiKey}
        quoteRequestId={requestId}
        passthroughExternalId={passthroughExternalId}
        onError={(error) => {
          onOnrampError(error.message, error)
        }}
      />
      {step === OnrampStep.ProcessingPassthrough ? (
        <OnrampProcessingPassthroughStep
          toToken={toToken}
          amountToTokenFormatted={amountToTokenFormatted}
          moonpayTxUrl={moonpayTxUrl ?? undefined}
          amount={amountFormatted}
        />
      ) : null}
      {step === OnrampStep.Processing ? (
        <OnrampProcessingStepUI
          toToken={toToken}
          fromToken={fromToken}
          fromChain={fromChain}
          toChain={toChain}
          moonpayTxUrl={moonpayTxUrl ?? undefined}
          fillTxUrl={fillTxUrl}
          fillTxHash={fillTxHash}
          processingStep={processingStep}
          baseTransactionUrl={baseTransactionUrl}
          requestId={requestId ?? undefined}
        />
      ) : null}
      {step === OnrampStep.Success ? (
        <OnrampSuccessStep
          toToken={toToken}
          isLoadingTransaction={isLoadingTransaction}
          fillTxHash={fillTxHash}
          fillTxUrl={fillTxUrl}
          moonpayTxUrl={moonpayTxUrl ?? undefined}
          toAmountFormatted={toAmountFormatted}
          baseTransactionUrl={baseTransactionUrl}
          onOpenChange={onOpenChange}
        />
      ) : null}
      {step === OnrampStep.Error ? (
        <ErrorStep
          error={quoteError || swapError}
          allTxHashes={allTxHashes}
          address={recipient}
          onOpenChange={onOpenChange}
          transaction={transaction ?? undefined}
          fromChain={fromChain}
          toChain={toChain}
        />
      ) : null}
    </Modal>
  )
}
