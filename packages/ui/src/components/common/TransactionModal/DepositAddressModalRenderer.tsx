import {
  type FC,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
  type SetStateAction,
  type Dispatch,
  useContext
} from 'react'
import { parseUnits, type Address } from 'viem'
import {
  type AdaptedWallet,
  type Execute,
  type RelayChain
} from '@relayprotocol/relay-sdk'
import {
  calculateFillTime,
  extractDepositRequestId
} from '../../../utils/relayTransaction.js'
import type { Token } from '../../../types/index.js'
import {
  useRequests,
  useExecutionStatus,
  queryQuote
} from '@relayprotocol/relay-kit-hooks'
import { useRelayClient } from '../../../hooks/index.js'
import { EventNames } from '../../../constants/events.js'
import { ProviderOptionsContext } from '../../../providers/RelayKitProvider.js'
import { useAccount } from 'wagmi'
import {
  calculatePriceTimeEstimate,
  extractDepositAddress,
  extractQuoteId
} from '../../../utils/quote.js'
import { getDeadAddress } from '@relayprotocol/relay-sdk'
import { bitcoin } from '../../../utils/bitcoin.js'
import { errorToJSON } from '../../../utils/errors.js'
import { sha256 } from '../../../utils/hashing.js'
import { get15MinuteInterval } from '../../../utils/time.js'

export enum TransactionProgressStep {
  WaitingForDeposit,
  Validating,
  Success,
  Error
}

export type TxHashes = { txHash: string; chainId: number }[]

export type ChildrenProps = {
  progressStep: TransactionProgressStep
  setProgressStep: Dispatch<SetStateAction<TransactionProgressStep>>
  quote?: Execute | null
  isFetchingQuote: boolean
  quoteError: Error | null
  swapError: Error | null
  setSwapError: Dispatch<SetStateAction<Error | null>>
  allTxHashes: TxHashes
  transaction?: ReturnType<typeof useRequests>['data']['0']
  seconds: number
  fillTime: string
  requestId: string | null
  depositAddress?: string
  executionStatus?: ReturnType<typeof useExecutionStatus>['data']
  isLoadingTransaction: boolean
  toChain?: RelayChain | null
  timeEstimate?: { time: number; formattedTime: string }
}

type Props = {
  open: boolean
  address?: string
  fromToken?: Token
  fromChain?: RelayChain
  toToken?: Token
  debouncedOutputAmountValue: string
  debouncedInputAmountValue: string
  recipient?: string
  customToAddress?: Address
  wallet?: AdaptedWallet
  invalidateBalanceQueries: () => void
  children: (props: ChildrenProps) => ReactNode
  onSuccess?: (
    quote?: Execute | null,
    executionStatus?: ReturnType<typeof useExecutionStatus>['data']
  ) => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onSwapError?: (error: string, data?: Execute) => void
}

export const DepositAddressModalRenderer: FC<Props> = ({
  open,
  address,
  fromChain,
  fromToken,
  toToken,
  debouncedInputAmountValue,
  debouncedOutputAmountValue,
  recipient,
  invalidateBalanceQueries,
  children,
  onSuccess,
  onAnalyticEvent,
  onSwapError
}) => {
  const [quoteData, setQuoteData] = useState<Execute | null>(null)
  const [fetchingQuote, setFetchingQuote] = useState(false)
  const [quoteError, setQuoteError] = useState<Error | null>(null)
  const [progressStep, setProgressStep] = useState(
    TransactionProgressStep.WaitingForDeposit
  )
  const [swapError, setSwapError] = useState<Error | null>(null)

  const relayClient = useRelayClient()
  const providerOptionsContext = useContext(ProviderOptionsContext)
  const { connector } = useAccount()
  const deadAddress = getDeadAddress(fromChain?.vmType, fromChain?.id)

  const quote = fetchingQuote ? undefined : quoteData

  const requestId = useMemo(
    () => extractDepositRequestId(quote?.steps as Execute['steps']),
    [quote]
  )

  const depositAddress = useMemo(
    () => extractDepositAddress(quote?.steps as Execute['steps']),
    [quote]
  )

  useEffect(() => {
    if (!open) {
      if (quote) {
        onAnalyticEvent?.(EventNames.DEPOSIT_ADDRESS_MODAL_CLOSED)
      }
      setSwapError(null)
      setQuoteData(null)
      setFetchingQuote(false)
      setQuoteError(null)
    } else {
      setProgressStep(TransactionProgressStep.WaitingForDeposit)
      onAnalyticEvent?.(EventNames.DEPOSIT_ADDRESS_MODAL_OPEN)
      const quoteParameters: Parameters<typeof queryQuote>['1'] =
        fromToken && toToken
          ? {
              user: deadAddress,
              originChainId: fromToken.chainId,
              destinationChainId: toToken.chainId,
              originCurrency: fromToken.address,
              destinationCurrency: toToken.address,
              recipient: recipient as string,
              tradeType: 'EXACT_INPUT',
              appFees: providerOptionsContext.appFees,
              amount: parseUnits(
                debouncedInputAmountValue,
                fromToken.decimals
              ).toString(),
              referrer: relayClient?.source ?? undefined,
              useDepositAddress: true
            }
          : undefined
      const interval = get15MinuteInterval()
      const quoteRequestId = sha256({ ...quoteParameters, interval })
      onAnalyticEvent?.(EventNames.QUOTE_REQUESTED, {
        parameters: quoteParameters,
        quote_request_id: quoteRequestId,
        chain_id_in: quoteParameters?.originChainId,
        chain_id_out: quoteParameters?.destinationChainId
      })
      queryQuote(relayClient?.baseApiUrl, quoteParameters, {
        headers: {
          'relay-sdk-version': relayClient?.version ?? 'unknown',
          'relay-kit-ui-version': relayClient?.uiVersion ?? 'unknown'
        }
      })
        .then((quote) => {
          setFetchingQuote(false)
          if (!open) {
            return
          }
          setQuoteData(quote as Execute)
          const interval = get15MinuteInterval()
          const quoteRequestId = sha256({ ...quoteParameters, interval })
          onAnalyticEvent?.(EventNames.QUOTE_RECEIVED, {
            parameters: quoteParameters,
            wallet_connector: connector?.name,
            quote_id: quote.steps ? extractQuoteId(quote.steps) : undefined,
            quote_request_id: quoteRequestId,
            amount_in: quote.details?.currencyIn?.amountFormatted,
            amount_in_raw: quote.details?.currencyIn?.amount,
            currency_in: quote.details?.currencyIn?.currency?.symbol,
            chain_id_in: quote.details?.currencyIn?.currency?.chainId,
            amount_out: quote.details?.currencyOut?.amountFormatted,
            amount_out_raw: quote.details?.currencyOut?.amount,
            currency_out: quote.details?.currencyOut?.currency?.symbol,
            chain_id_out: quote.details?.currencyOut?.currency?.chainId,
            slippage_tolerance_destination_percentage:
              quote.details?.slippageTolerance?.destination?.percent,
            slippage_tolerance_origin_percentage:
              quote.details?.slippageTolerance?.origin?.percent,
            steps: quote.steps
          })
        })
        .catch((e) => {
          setFetchingQuote(false)
          if (!open) {
            return
          }
          const errorMessage = errorToJSON(
            e?.response?.data?.message
              ? new Error(e?.response?.data?.message)
              : e
          )
          const interval = get15MinuteInterval()
          const quoteRequestId = sha256({ ...quoteParameters, interval })
          onAnalyticEvent?.(EventNames.QUOTE_ERROR, {
            wallet_connector: connector?.name,
            error_message: errorMessage,
            parameters: quoteParameters,
            quote_request_id: quoteRequestId
          })
          setQuoteError(e)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const { data: executionStatus } = useExecutionStatus(
    relayClient ? relayClient : undefined,
    {
      requestId: requestId ?? undefined,
      referrer: relayClient?.source
    },
    undefined,
    undefined,
    {
      enabled: requestId !== null && open,
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

  useEffect(() => {
    if (
      executionStatus?.status === 'failure' ||
      executionStatus?.status === 'refund' ||
      quoteError
    ) {
      const swapError = new Error(
        executionStatus?.details ??
          'Oops! Something went wrong while processing your transaction.'
      )
      if (progressStep !== TransactionProgressStep.Error) {
        onSwapError?.(swapError.message, quote as Execute)
      }
      setProgressStep(TransactionProgressStep.Error)
      onAnalyticEvent?.(EventNames.DEPOSIT_ADDRESS_SWAP_ERROR, {
        error_message: errorToJSON(executionStatus?.details ?? quoteError),
        wallet_connector: connector?.name,
        quote_id: requestId,
        amount_in: parseFloat(`${debouncedInputAmountValue}`),
        currency_in: fromToken?.symbol,
        chain_id_in: fromToken?.chainId,
        amount_out: parseFloat(`${debouncedOutputAmountValue}`),
        currency_out: toToken?.symbol,
        chain_id_out: toToken?.chainId,
        txHashes: executionStatus?.txHashes ?? []
      })
      setSwapError(swapError)
      invalidateBalanceQueries()
    } else if (executionStatus?.status === 'success') {
      if (progressStep !== TransactionProgressStep.Success) {
        onSuccess?.(quote, executionStatus)
      }
      setProgressStep(TransactionProgressStep.Success)
      invalidateBalanceQueries()
    } else if (executionStatus?.status === 'pending') {
      const timeEstimateMs =
        ((quote?.details?.timeEstimate ?? 0) +
          (fromChain && fromChain.id === bitcoin.id ? 600 : 0)) *
        1000
      const isDelayedTx =
        timeEstimateMs >
        (relayClient?.maxPollingAttemptsBeforeTimeout ?? 30) *
          (relayClient?.pollingInterval ?? 5000)
      if (isDelayedTx) {
        setProgressStep(TransactionProgressStep.Success)
      } else {
        setProgressStep(TransactionProgressStep.Validating)
      }
    }
  }, [executionStatus?.status, quoteError])

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

  const { data: transactions, isLoading: isLoadingTransaction } = useRequests(
    (progressStep === TransactionProgressStep.Success ||
      progressStep === TransactionProgressStep.Error) &&
      allTxHashes[0]
      ? {
          user: address,
          hash: allTxHashes[0]?.txHash
        }
      : undefined,
    relayClient?.baseApiUrl,
    {
      enabled:
        (progressStep === TransactionProgressStep.Success ||
          progressStep === TransactionProgressStep.Error) &&
        allTxHashes[0]
          ? true
          : false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      retryOnMount: false
    }
  )

  const transaction = transactions[0]

  const { fillTime, seconds } = calculateFillTime(transaction)
  const timeEstimate = calculatePriceTimeEstimate(quote?.details)
  const toChain = toToken?.chainId
    ? relayClient?.chains.find((chain) => chain.id === toToken?.chainId)
    : null

  return (
    <>
      {children({
        progressStep,
        setProgressStep,
        quote,
        isFetchingQuote: fetchingQuote,
        quoteError,
        swapError,
        setSwapError,
        allTxHashes,
        transaction,
        fillTime,
        seconds,
        requestId,
        depositAddress,
        executionStatus,
        isLoadingTransaction,
        toChain,
        timeEstimate
      })}
    </>
  )
}
