import type { Dispatch, FC, ReactNode, SetStateAction } from 'react'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  useCurrencyBalance,
  useENSResolver,
  useRelayClient,
  useDebounceState,
  useWalletAddress,
  useDisconnected,
  usePreviousValueChange,
  useIsWalletCompatible,
  useFallbackState,
  useGasTopUpRequired,
  useEOADetection
} from '../../hooks/index.js'
import type { Address, WalletClient } from 'viem'
import { formatUnits, parseUnits } from 'viem'
import { useAccount, useWalletClient } from 'wagmi'
import { useCapabilities } from 'wagmi/experimental'
import type { Token } from '../../types/index.js'
import { useQueryClient } from '@tanstack/react-query'
import type { ChainVM, Execute } from '@relayprotocol/relay-sdk'
import {
  calculatePriceTimeEstimate,
  calculateRelayerFeeProportionUsd,
  calculateUsdValue,
  extractQuoteId,
  getCurrentStep,
  getSwapEventData,
  isHighRelayerServiceFeeUsd,
  parseFees
} from '../../utils/quote.js'
import { useQuote, useTokenPrice } from '@relayprotocol/relay-kit-hooks'
import { EventNames } from '../../constants/events.js'
import { ProviderOptionsContext } from '../../providers/RelayKitProvider.js'
import type { DebouncedState } from 'usehooks-ts'
import type { AdaptedWallet } from '@relayprotocol/relay-sdk'
import type { LinkedWallet } from '../../types/index.js'
import {
  addressWithFallback,
  isValidAddress,
  findSupportedWallet
} from '../../utils/address.js'
import { adaptViemWallet, getDeadAddress } from '@relayprotocol/relay-sdk'
import { errorToJSON } from '../../utils/errors.js'
import { useSwapButtonCta } from '../../hooks/widget/useSwapButtonCta.js'
import { sha256 } from '../../utils/hashing.js'
import { get15MinuteInterval } from '../../utils/time.js'
import type { FeeBreakdown } from '../../types/FeeBreakdown.js'

export type TradeType = 'EXACT_INPUT' | 'EXPECTED_OUTPUT'

type SwapWidgetRendererProps = {
  transactionModalOpen: boolean
  setTransactionModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  depositAddressModalOpen: boolean
  children: (props: ChildrenProps) => ReactNode
  fromToken?: Token
  setFromToken?: (token?: Token) => void
  toToken?: Token
  setToToken?: (token?: Token) => void
  defaultToAddress?: Address
  defaultAmount?: string
  defaultTradeType?: TradeType
  slippageTolerance?: string
  context: 'Swap' | 'Deposit' | 'Withdraw'
  wallet?: AdaptedWallet
  linkedWallets?: LinkedWallet[]
  multiWalletSupportEnabled?: boolean
  supportedWalletVMs: Omit<ChainVM, 'hypevm'>[]
  onConnectWallet?: () => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onSwapError?: (error: string, data?: Execute) => void
  sponsoredTokens?: string[]
}

export type ChildrenProps = {
  quote?: ReturnType<typeof useQuote>['data']
  steps: Execute['steps'] | null
  setSteps: Dispatch<React.SetStateAction<Execute['steps'] | null>>
  swap: () => void
  transactionModalOpen: boolean
  details: null | Execute['details']
  feeBreakdown: FeeBreakdown | null
  fromToken?: Token
  setFromToken: Dispatch<React.SetStateAction<Token | undefined>>
  toToken?: Token
  setToToken: Dispatch<React.SetStateAction<Token | undefined>>
  swapError: Error | null
  error: Error | null
  toDisplayName?: string
  address?: Address | string
  recipient?: Address | string
  customToAddress?: Address | string
  setCustomToAddress: Dispatch<
    React.SetStateAction<Address | string | undefined>
  >
  tradeType: TradeType
  setTradeType: Dispatch<React.SetStateAction<TradeType>>
  isSameCurrencySameRecipientSwap: boolean
  amountInputValue: string
  debouncedInputAmountValue: string
  setAmountInputValue: (value: string) => void
  debouncedAmountInputControls: DebouncedState<(value: string) => void>
  amountOutputValue: string
  debouncedOutputAmountValue: string
  setAmountOutputValue: (value: string) => void
  debouncedAmountOutputControls: DebouncedState<(value: string) => void>
  toBalance?: bigint
  toBalancePending?: boolean
  fromBalance?: bigint
  fromBalancePending?: boolean
  isFetchingQuote: boolean
  isLoadingToBalance: boolean
  isLoadingFromBalance: boolean
  highRelayerServiceFee: boolean
  relayerFeeProportion: bigint
  hasInsufficientBalance: boolean
  isInsufficientLiquidityError?: boolean
  isCapacityExceededError?: boolean
  isCouldNotExecuteError?: boolean
  ctaCopy: string
  isFromNative: boolean
  useExternalLiquidity: boolean
  slippageTolerance?: string
  supportsExternalLiquidity: boolean
  timeEstimate?: { time: number; formattedTime: string }
  canonicalTimeEstimate?: { time: number; formattedTime: string }
  fetchingExternalLiquiditySupport: boolean
  isSvmSwap: boolean
  isBvmSwap: boolean
  isValidFromAddress: boolean
  isValidToAddress: boolean
  supportedWalletVMs: Omit<ChainVM, 'hypevm'>[]
  fromChainWalletVMSupported: boolean
  toChainWalletVMSupported: boolean
  isRecipientLinked?: boolean
  recipientWalletSupportsChain?: boolean
  gasTopUpEnabled: boolean
  setGasTopUpEnabled: Dispatch<React.SetStateAction<boolean>>
  gasTopUpRequired: boolean
  gasTopUpAmount?: bigint
  gasTopUpAmountUsd?: string
  quoteInProgress: null | Execute
  setQuoteInProgress: Dispatch<React.SetStateAction<null | Execute>>
  linkedWallet?: LinkedWallet
  quoteParameters?: Parameters<typeof useQuote>['2']
  invalidateBalanceQueries: () => void
  invalidateQuoteQuery: () => void
  setUseExternalLiquidity: Dispatch<React.SetStateAction<boolean>>
  setDetails: Dispatch<React.SetStateAction<Execute['details'] | null>>
  setSwapError: Dispatch<React.SetStateAction<Error | null>>
  abortController: AbortController | null
  fromTokenPriceData: ReturnType<typeof useTokenPrice>['data']
  isLoadingFromTokenPrice: boolean
  toTokenPriceData: ReturnType<typeof useTokenPrice>['data']
  isLoadingToTokenPrice: boolean
  sponsoredTokens?: string[]
}

// shared query options for useTokenPrice
const tokenPriceQueryOptions = {
  staleTime: 60 * 1000, // 1 minute
  refetchInterval: 30 * 1000, // 30 seconds
  refetchOnWindowFocus: false
}

const SwapWidgetRenderer: FC<SwapWidgetRendererProps> = ({
  transactionModalOpen,
  setTransactionModalOpen,
  depositAddressModalOpen,
  fromToken: _fromToken,
  setFromToken: _setFromToken,
  toToken: _toToken,
  setToToken: _setToToken,
  defaultToAddress,
  defaultAmount,
  defaultTradeType,
  slippageTolerance,
  context,
  wallet,
  multiWalletSupportEnabled = false,
  linkedWallets,
  supportedWalletVMs,
  sponsoredTokens,
  children,
  onAnalyticEvent,
  onSwapError
}) => {
  const [fromToken, setFromToken] = useFallbackState(
    _setFromToken ? _fromToken : undefined,
    _setFromToken
      ? [
          _fromToken,
          _setFromToken as Dispatch<SetStateAction<Token | undefined>>
        ]
      : undefined
  )
  const [toToken, setToToken] = useFallbackState(
    _setToToken ? _toToken : undefined,
    _setToToken
      ? [_toToken, _setToToken as Dispatch<SetStateAction<Token | undefined>>]
      : undefined
  )
  const providerOptionsContext = useContext(ProviderOptionsContext)
  const connectorKeyOverrides = providerOptionsContext.vmConnectorKeyOverrides
  const relayClient = useRelayClient()
  const { connector } = useAccount()
  const walletClient = useWalletClient()
  const [customToAddress, setCustomToAddress] = useState<
    Address | string | undefined
  >(defaultToAddress)
  const [useExternalLiquidity, setUseExternalLiquidity] =
    useState<boolean>(false)
  const address = useWalletAddress(wallet, linkedWallets)

  const [tradeType, setTradeType] = useState<'EXACT_INPUT' | 'EXPECTED_OUTPUT'>(
    defaultTradeType ?? 'EXACT_INPUT'
  )
  const queryClient = useQueryClient()
  const [steps, setSteps] = useState<null | Execute['steps']>(null)
  const [quoteInProgress, setQuoteInProgress] = useState<null | Execute>(null)
  const [waitingForSteps, setWaitingForSteps] = useState(false)
  const [details, setDetails] = useState<null | Execute['details']>(null)
  const [gasTopUpEnabled, setGasTopUpEnabled] = useState(false)
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

  const {
    value: amountInputValue,
    debouncedValue: debouncedInputAmountValue,
    setValue: setAmountInputValue,
    debouncedControls: debouncedAmountInputControls
  } = useDebounceState<string>(
    !defaultTradeType || defaultTradeType === 'EXACT_INPUT'
      ? (defaultAmount ?? '')
      : '',
    500
  )
  const {
    value: amountOutputValue,
    debouncedValue: debouncedOutputAmountValue,
    setValue: setAmountOutputValue,
    debouncedControls: debouncedAmountOutputControls
  } = useDebounceState<string>(
    defaultTradeType === 'EXPECTED_OUTPUT' ? (defaultAmount ?? '') : '',
    500
  )

  const [swapError, setSwapError] = useState<Error | null>(null)
  const tokenPairIsCanonical =
    fromToken?.chainId !== undefined &&
    toToken?.chainId !== undefined &&
    fromToken.symbol === toToken.symbol

  const toChain = relayClient?.chains.find(
    (chain) => chain.id === toToken?.chainId
  )
  const fromChain = relayClient?.chains?.find(
    (chain) => chain.id === fromToken?.chainId
  )

  const fromChainWalletVMSupported =
    !fromChain?.vmType ||
    supportedWalletVMs.includes(fromChain?.vmType) ||
    fromChain?.id === 1337
  const toChainWalletVMSupported =
    !toChain?.vmType || supportedWalletVMs.includes(toChain?.vmType)

  const defaultRecipient = useMemo(() => {
    const _linkedWallet = linkedWallets?.find(
      (linkedWallet) =>
        address ===
        (linkedWallet.vmType === 'evm'
          ? linkedWallet.address.toLowerCase()
          : linkedWallet.address)
    )
    const _isValidToAddress = isValidAddress(
      toChain?.vmType,
      customToAddress ?? '',
      toChain?.id,
      !customToAddress && _linkedWallet?.address === address
        ? _linkedWallet?.connector
        : undefined,
      connectorKeyOverrides
    )
    if (
      multiWalletSupportEnabled &&
      toChain &&
      linkedWallets &&
      !_isValidToAddress
    ) {
      const supportedAddress = findSupportedWallet(
        toChain,
        customToAddress,
        linkedWallets,
        connectorKeyOverrides
      )

      return supportedAddress
    }
  }, [
    multiWalletSupportEnabled,
    toChain,
    customToAddress,
    address,
    linkedWallets,
    setCustomToAddress
  ])

  const recipient = customToAddress ?? defaultRecipient ?? address

  const {
    value: fromBalance,
    queryKey: fromBalanceQueryKey,
    isLoading: isLoadingFromBalance,
    isError: fromBalanceErrorFetching,
    isDuneBalance: fromBalanceIsDune,
    hasPendingBalance: fromBalancePending
  } = useCurrencyBalance({
    chain: fromChain,
    address: address,
    currency: fromToken?.address ? (fromToken.address as Address) : undefined,
    enabled: fromToken !== undefined,
    refreshInterval: undefined,
    wallet
  })

  const {
    value: toBalance,
    queryKey: toBalanceQueryKey,
    isLoading: isLoadingToBalance,
    isDuneBalance: toBalanceIsDune,
    hasPendingBalance: toBalancePending
  } = useCurrencyBalance({
    chain: toChain,
    address: recipient,
    currency: toToken?.address ? (toToken.address as Address) : undefined,
    enabled: toToken !== undefined,
    refreshInterval: undefined,
    wallet
  })

  const invalidateBalanceQueries = useCallback(() => {
    const invalidatePeriodically = (invalidateFn: () => void) => {
      let maxRefreshes = 4
      let refreshCount = 0
      const timer = setInterval(() => {
        if (maxRefreshes === refreshCount) {
          clearInterval(timer)
          return
        }
        refreshCount++
        invalidateFn()
      }, 3000)
    }

    queryClient.invalidateQueries({ queryKey: ['useDuneBalances'] })

    // Dune balances are sometimes stale, because of this we need to aggressively fetch them
    // for a predetermined period to make sure we get back a fresh response
    if (fromBalanceIsDune) {
      invalidatePeriodically(() => {
        queryClient.invalidateQueries({ queryKey: fromBalanceQueryKey })
      })
    } else {
      queryClient.invalidateQueries({ queryKey: fromBalanceQueryKey })
    }
    if (toBalanceIsDune) {
      invalidatePeriodically(() => {
        queryClient.invalidateQueries({ queryKey: toBalanceQueryKey })
      })
    } else {
      queryClient.invalidateQueries({ queryKey: toBalanceQueryKey })
    }
  }, [
    queryClient,
    fromBalanceQueryKey,
    toBalanceQueryKey,
    toBalanceIsDune,
    fromBalanceIsDune,
    address
  ])
  const { data: capabilities } = useCapabilities({
    query: {
      enabled:
        connector &&
        (connector.id === 'coinbaseWalletSDK' || connector.id === 'coinbase')
    }
  })
  const hasAuxiliaryFundsSupport = Boolean(
    fromToken?.chainId
      ? capabilities?.[fromToken?.chainId]?.auxiliaryFunds?.supported
      : false
  )

  const isSvmSwap = fromChain?.vmType === 'svm' || toChain?.vmType === 'svm'
  const isBvmSwap = fromChain?.vmType === 'bvm' || toChain?.vmType === 'bvm'
  const linkedWallet = linkedWallets?.find(
    (linkedWallet) =>
      address ===
        (linkedWallet.vmType === 'evm'
          ? linkedWallet.address.toLowerCase()
          : linkedWallet.address) || linkedWallet.address === address
  )

  const isRecipientLinked =
    (recipient
      ? linkedWallets?.find((wallet) => wallet.address === recipient)
      : undefined) !== undefined

  const isValidFromAddress = isValidAddress(
    fromChain?.vmType,
    address ?? '',
    fromChain?.id,
    linkedWallet?.connector,
    connectorKeyOverrides
  )
  const fromAddressWithFallback = addressWithFallback(
    fromChain?.vmType,
    address,
    fromChain?.id,
    linkedWallet?.connector,
    connectorKeyOverrides
  )

  const isValidToAddress = isValidAddress(
    toChain?.vmType,
    recipient ?? '',
    toChain?.id
  )

  const toAddressWithFallback = addressWithFallback(
    toChain?.vmType,
    recipient,
    toChain?.id
  )

  const externalLiquiditySupport = useQuote(
    relayClient ? relayClient : undefined,
    wallet,
    fromToken && toToken
      ? {
          user: getDeadAddress(fromChain?.vmType, fromChain?.id),
          originChainId: fromToken.chainId,
          destinationChainId: toToken.chainId,
          originCurrency: fromToken.address,
          destinationCurrency: toToken.address,
          recipient: getDeadAddress(toChain?.vmType, toChain?.id),
          tradeType,
          appFees: providerOptionsContext.appFees,
          amount: '10000000000000000000000', //Hardcode an extremely high number
          referrer: relayClient?.source ?? undefined,
          useExternalLiquidity: true
        }
      : undefined,
    undefined,
    undefined,
    {
      refetchOnWindowFocus: false,
      enabled:
        fromToken !== undefined &&
        toToken !== undefined &&
        fromChain &&
        toChain &&
        (fromChain.id === toChain.baseChainId ||
          toChain.id === fromChain.baseChainId)
    }
  )
  const supportsExternalLiquidity =
    tokenPairIsCanonical &&
    externalLiquiditySupport.status === 'success' &&
    fromChainWalletVMSupported
      ? true
      : false

  const { displayName: toDisplayName } = useENSResolver(recipient, {
    enabled: toChain?.vmType === 'evm' && isValidToAddress
  })

  const [currentSlippageTolerance, setCurrentSlippageTolerance] = useState<
    string | undefined
  >(slippageTolerance)

  useEffect(() => {
    setCurrentSlippageTolerance(slippageTolerance)
  }, [slippageTolerance])

  const {
    required: gasTopUpRequired,
    amount: _gasTopUpAmount,
    amountUsd: _gasTopUpAmountUsd
  } = useGasTopUpRequired(toChain, fromChain, toToken, recipient)

  //  Retrieve the price of the `from` token
  const { data: fromTokenPriceData, isLoading: isLoadingFromTokenPrice } =
    useTokenPrice(
      relayClient?.baseApiUrl,
      {
        address: fromToken?.address ?? '',
        chainId: fromToken?.chainId ?? 0,
        referrer: relayClient?.source
      },
      {
        enabled: !!(fromToken?.address && fromToken.chainId),
        ...tokenPriceQueryOptions
      }
    )

  // Retrieve the price of the `to` token
  const { data: toTokenPriceData, isLoading: isLoadingToTokenPrice } =
    useTokenPrice(
      relayClient?.baseApiUrl,
      {
        address: toToken?.address ?? '',
        chainId: toToken?.chainId ?? 0,
        referrer: relayClient?.source
      },
      {
        enabled: !!(toToken?.address && toToken.chainId),
        ...tokenPriceQueryOptions
      }
    )
  const originChainSupportsProtocolv2 =
    fromChain?.protocol?.v2?.depository !== undefined &&
    toChain?.protocol?.v2?.chainId !== undefined

  const quoteProtocol = useMemo(() => {
    //Enabled only on certain chains
    if (fromChain?.id && originChainSupportsProtocolv2) {
      if (!fromToken && !fromTokenPriceData) {
        return undefined
      }

      const relevantPrice =
        fromTokenPriceData?.price && !isLoadingFromTokenPrice
          ? fromTokenPriceData.price
          : undefined
      const amount =
        tradeType === 'EXACT_INPUT'
          ? debouncedInputAmountValue
          : debouncedOutputAmountValue

      if (!amount) {
        return undefined
      }

      const usdAmount = relevantPrice
        ? calculateUsdValue(relevantPrice, amount)
        : undefined

      return usdAmount !== undefined && usdAmount <= 10000
        ? 'preferV2'
        : undefined
    } else {
      return undefined
    }
  }, [
    fromTokenPriceData,
    isLoadingFromTokenPrice,
    debouncedInputAmountValue,
    tradeType,
    originChainSupportsProtocolv2,
    fromChain?.id
  ])

  const loadingProtocolVersion =
    fromChain?.id && originChainSupportsProtocolv2 && isLoadingFromTokenPrice

  // Get native balance only when not swapping from native token
  const isFromNative = fromToken?.address === fromChain?.currency?.address
  const { value: nativeBalance } = useCurrencyBalance({
    chain: fromChain,
    address: address,
    currency: fromChain?.currency?.address
      ? (fromChain.currency.address as string)
      : undefined,
    enabled: fromToken !== undefined && !isFromNative,
    wallet
  })

  const effectiveNativeBalance = isFromNative ? fromBalance : nativeBalance
  const hasZeroNativeBalance = effectiveNativeBalance === 0n

  const eoaExplicitDeposit = useEOADetection(
    wallet,
    quoteProtocol,
    fromToken?.chainId,
    fromChain?.vmType
  )

  const explicitDeposit = hasZeroNativeBalance ? true : eoaExplicitDeposit
  const normalizedSponsoredTokens = useMemo(() => {
    const chainVms = relayClient?.chains.reduce(
      (chains, chain) => {
        chains[chain.id] = chain.vmType as ChainVM
        return chains
      },
      {} as Record<number, ChainVM>
    )
    return sponsoredTokens?.map((token) => {
      const [chainId, address] = token.match(/^([^:]*):?(.*)$/)?.slice(1) ?? []
      const chainVm = chainVms?.[Number(chainId)]
      const normalizedAddress =
        chainVm && chainVm === 'evm' ? address.toLowerCase() : address
      return `${chainId}:${normalizedAddress}`
    })
  }, [sponsoredTokens, relayClient?.chains])

  const normalizedToToken =
    toChain?.vmType === 'evm'
      ? `${toToken?.chainId}:${toToken?.address.toLowerCase()}`
      : `${toToken?.chainId}:${toToken?.address}`
  const normalizedFromToken =
    fromChain?.vmType === 'evm'
      ? `${fromToken?.chainId}:${fromToken?.address.toLowerCase()}`
      : `${fromToken?.chainId}:${fromToken?.address}`

  const isGasSponsorshipEnabled =
    normalizedSponsoredTokens &&
    normalizedSponsoredTokens.length > 0 &&
    toToken &&
    fromToken &&
    normalizedSponsoredTokens.includes(normalizedToToken) &&
    normalizedSponsoredTokens.includes(normalizedFromToken)

  const shouldSetQuoteParameters =
    fromToken &&
    toToken &&
    (quoteProtocol !== 'preferV2' ||
      fromChain?.vmType !== 'evm' ||
      explicitDeposit !== undefined)

  const quoteParameters: Parameters<typeof useQuote>['2'] =
    shouldSetQuoteParameters
      ? {
          user: fromAddressWithFallback,
          originChainId: fromToken.chainId,
          destinationChainId: toToken.chainId,
          originCurrency: fromToken.address,
          destinationCurrency: toToken.address,
          recipient: toAddressWithFallback,
          tradeType,
          appFees: providerOptionsContext.appFees,
          amount:
            tradeType === 'EXACT_INPUT'
              ? parseUnits(
                  debouncedInputAmountValue,
                  fromToken.decimals
                ).toString()
              : parseUnits(
                  debouncedOutputAmountValue,
                  toToken.decimals
                ).toString(),
          referrer: relayClient?.source ?? undefined,
          useExternalLiquidity,
          useDepositAddress:
            !fromChainWalletVMSupported || fromToken?.chainId === 1337,
          refundTo: fromToken?.chainId === 1337 ? address : undefined,
          slippageTolerance: slippageTolerance,
          topupGas: gasTopUpEnabled && gasTopUpRequired,
          protocolVersion: quoteProtocol,
          ...(quoteProtocol === 'preferV2' &&
            explicitDeposit !== undefined && {
              explicitDeposit: explicitDeposit
            })
        }
      : undefined

  const onQuoteRequested: Parameters<typeof useQuote>['3'] = (
    options,
    config
  ) => {
    const interval = get15MinuteInterval()
    const quoteRequestId = sha256({ ...options, interval })
    onAnalyticEvent?.(EventNames.QUOTE_REQUESTED, {
      parameters: options,
      wallet_connector: linkedWallet?.connector,
      chain_id_in: options?.originChainId,
      chain_id_out: options?.destinationChainId,
      http_config: config,
      quote_request_id: quoteRequestId
    })
  }

  const onQuoteReceived: Parameters<typeof useQuote>['4'] = (
    { details, steps },
    options
  ) => {
    const interval = get15MinuteInterval()
    const quoteRequestId = sha256({ ...options, interval })
    onAnalyticEvent?.(EventNames.QUOTE_RECEIVED, {
      parameters: options,
      wallet_connector: linkedWallet?.connector,
      amount_in: details?.currencyIn?.amountFormatted,
      amount_in_raw: details?.currencyIn?.amount,
      currency_in: details?.currencyIn?.currency?.symbol,
      chain_id_in: details?.currencyIn?.currency?.chainId,
      amount_out: details?.currencyOut?.amountFormatted,
      amount_out_raw: details?.currencyOut?.amount,
      currency_out: details?.currencyOut?.currency?.symbol,
      chain_id_out: details?.currencyOut?.currency?.chainId,
      slippage_tolerance_destination_percentage:
        details?.slippageTolerance?.destination?.percent,
      slippage_tolerance_origin_percentage:
        details?.slippageTolerance?.origin?.percent,
      steps,
      quote_request_id: quoteRequestId,
      quote_id: steps ? extractQuoteId(steps) : undefined
    })
  }

  const quoteFetchingEnabled = Boolean(
    relayClient &&
      ((tradeType === 'EXACT_INPUT' &&
        debouncedInputAmountValue &&
        debouncedInputAmountValue.length > 0 &&
        Number(debouncedInputAmountValue) !== 0) ||
        (tradeType === 'EXPECTED_OUTPUT' &&
          debouncedOutputAmountValue &&
          debouncedOutputAmountValue.length > 0 &&
          Number(debouncedOutputAmountValue) !== 0)) &&
      fromToken !== undefined &&
      toToken !== undefined &&
      !transactionModalOpen &&
      !depositAddressModalOpen &&
      !loadingProtocolVersion
  )

  const {
    data: _quoteData,
    error: quoteError,
    isFetching: isFetchingQuote,
    executeQuote: executeSwap,
    queryKey: quoteQueryKey
  } = useQuote(
    relayClient ? relayClient : undefined,
    wallet,
    quoteParameters,
    onQuoteRequested,
    onQuoteReceived,
    {
      refetchOnWindowFocus: false,
      enabled: quoteFetchingEnabled && quoteParameters !== undefined,
      refetchInterval:
        !transactionModalOpen &&
        !depositAddressModalOpen &&
        debouncedInputAmountValue === amountInputValue &&
        debouncedOutputAmountValue === amountOutputValue
          ? 12000
          : undefined
    },
    (e: any) => {
      const errorMessage = errorToJSON(
        e?.response?.data?.message ? new Error(e?.response?.data?.message) : e
      )
      const interval = get15MinuteInterval()
      const quoteRequestId = sha256({ ...quoteParameters, interval })
      onAnalyticEvent?.(EventNames.QUOTE_ERROR, {
        wallet_connector: linkedWallet?.connector,
        error_message: errorMessage,
        parameters: quoteParameters,
        quote_request_id: quoteRequestId,
        status_code: e.response.status ?? e.status ?? ''
      })
    },
    undefined,
    isGasSponsorshipEnabled ? providerOptionsContext?.secureBaseUrl : undefined
  )

  const invalidateQuoteQuery = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: quoteQueryKey })
  }, [queryClient, quoteQueryKey])
  let error =
    _quoteData || (isFetchingQuote && quoteFetchingEnabled) ? null : quoteError
  let quote = error ? undefined : _quoteData
  const gasTopUpAmount = quote?.details?.currencyGasTopup?.amount
    ? BigInt(quote?.details?.currencyGasTopup?.amount)
    : _gasTopUpAmount
  const gasTopUpAmountUsd =
    quote?.details?.currencyGasTopup?.amountUsd ?? _gasTopUpAmountUsd

  useDisconnected(address, () => {
    setCustomToAddress(undefined)
  })

  useEffect(() => {
    if (tradeType === 'EXACT_INPUT') {
      const amountOut = quote?.details?.currencyOut?.amount ?? ''
      setAmountOutputValue(
        amountOut !== ''
          ? formatUnits(
              BigInt(amountOut),
              Number(quote?.details?.currencyOut?.currency?.decimals ?? 18)
            )
          : ''
      )
    } else if (tradeType === 'EXPECTED_OUTPUT') {
      const amountIn = quote?.details?.currencyIn?.amount ?? ''
      setAmountInputValue(
        amountIn !== ''
          ? formatUnits(
              BigInt(amountIn),
              Number(quote?.details?.currencyIn?.currency?.decimals ?? 18)
            )
          : ''
      )
    }
    debouncedAmountInputControls.flush()
    debouncedAmountOutputControls.flush()
  }, [quote, tradeType])

  useEffect(() => {
    if (
      useExternalLiquidity &&
      !externalLiquiditySupport.isFetching &&
      !supportsExternalLiquidity
    ) {
      setUseExternalLiquidity(false)
    }
  }, [
    supportsExternalLiquidity,
    useExternalLiquidity,
    externalLiquiditySupport.isFetching
  ])

  const feeBreakdown = useMemo(() => {
    const chains = relayClient?.chains
    const fromChain = chains?.find((chain) => chain.id === fromToken?.chainId)
    const toChain = chains?.find((chain) => chain.id === toToken?.chainId)
    return fromToken && toToken && fromChain && toChain && quote
      ? parseFees(toChain, fromChain, quote)
      : null
  }, [quote, fromToken, toToken, relayClient])

  const totalAmount = BigInt(quote?.details?.currencyIn?.amount ?? 0n)

  const hasInsufficientBalance = Boolean(
    !fromBalanceErrorFetching &&
      totalAmount &&
      address &&
      (fromBalance ?? 0n) < totalAmount &&
      !hasAuxiliaryFundsSupport &&
      fromChainWalletVMSupported
  )

  const fetchQuoteErrorMessage = error
    ? error?.message
      ? (error?.message as string)
      : 'Unknown Error'
    : null
  const fetchQuoteDataErrorMessage = error
    ? (error as any)?.response?.data?.message
      ? ((error as any)?.response?.data.message as string)
      : 'Unknown Error'
    : null
  const isInsufficientLiquidityError = Boolean(
    fetchQuoteErrorMessage?.includes('No quotes available')
  )
  const isCapacityExceededError =
    fetchQuoteDataErrorMessage?.includes(
      'Amount is higher than the available liquidity'
    ) || fetchQuoteDataErrorMessage?.includes('Insufficient relayer liquidity')
  const isCouldNotExecuteError =
    fetchQuoteDataErrorMessage?.includes('Could not execute')
  const highRelayerServiceFee = isHighRelayerServiceFeeUsd(quote)
  const relayerFeeProportion = calculateRelayerFeeProportionUsd(quote)
  const timeEstimate = calculatePriceTimeEstimate(quote?.details)
  const canonicalTimeEstimate = calculatePriceTimeEstimate(
    externalLiquiditySupport.data?.details
  )

  const recipientWalletSupportsChain = useIsWalletCompatible(
    toChain?.id,
    recipient,
    linkedWallets,
    onAnalyticEvent
  )

  const isSameCurrencySameRecipientSwap =
    fromToken?.address === toToken?.address &&
    fromToken?.chainId === toToken?.chainId &&
    address === recipient

  const ctaCopy = useSwapButtonCta({
    fromToken,
    toToken,
    multiWalletSupportEnabled,
    isValidFromAddress,
    fromChainWalletVMSupported,
    isValidToAddress,
    toChainWalletVMSupported,
    fromChain,
    toChain,
    isSameCurrencySameRecipientSwap,
    debouncedInputAmountValue,
    debouncedOutputAmountValue,
    hasInsufficientBalance,
    isInsufficientLiquidityError,
    quote,
    operation: quote?.details?.operation
  })

  usePreviousValueChange(
    isCapacityExceededError && supportsExternalLiquidity,
    !isFetchingQuote && !externalLiquiditySupport.isFetching,
    (capacityExceeded) => {
      if (capacityExceeded) {
        onAnalyticEvent?.(EventNames.CTA_MAX_CAPACITY_PROMPTED, {
          inputAmount: debouncedInputAmountValue,
          outputAmount: debouncedOutputAmountValue
        })
      }
    }
  )

  const swap = useCallback(async () => {
    let submittedEvents: string[] = []

    const swapErrorHandler = (
      error: any,
      currentSteps?: Execute['steps'] | null
    ) => {
      const errorMessage = errorToJSON(
        error?.response?.data?.message
          ? new Error(error?.response?.data?.message)
          : error
      )
      if (
        error &&
        ((typeof error.message === 'string' &&
          error.message.includes('rejected')) ||
          (typeof error === 'string' && error.includes('rejected')) ||
          (typeof error === 'string' && error.includes('Approval Denied')) ||
          (typeof error === 'string' && error.includes('denied transaction')) ||
          (typeof error.message === 'string' &&
            error.message.includes('Approval Denied')) ||
          (typeof error.message === 'string' &&
            error.message.includes('Plugin Closed')) ||
          (typeof error.message === 'string' &&
            error.message.includes('denied transaction')) ||
          (typeof error.message === 'string' &&
            error.message.includes('Failed to initialize request') &&
            fromChain?.id === 2741)) // Abstract @TODO: remove once privy improves handling rejected transactions
      ) {
        // Close the transaction modal if the user rejects the tx
        setTransactionModalOpen(false)
        onAnalyticEvent?.(EventNames.USER_REJECTED_WALLET, {
          error_message: errorMessage
        })
        return
      }

      const { step, stepItem } = getCurrentStep(currentSteps)
      const swapEventData = {
        ...getSwapEventData(
          quote?.details,
          quote?.fees,
          currentSteps ?? null,
          linkedWallet?.connector,
          quoteParameters
        ),
        error_message: errorMessage
      }
      const isApproval = step?.id === 'approve'
      const errorEvent = isApproval
        ? EventNames.APPROVAL_ERROR
        : EventNames.DEPOSIT_ERROR

      //Filter out receipt/deposit transaction errors, those are approval/deposit errors
      const isTransactionConfirmationError =
        (error &&
          typeof error.message === 'string' &&
          error.message.includes('TransactionConfirmationError')) ||
        (error.name && error.name.includes('TransactionConfirmationError'))
      if (
        stepItem?.receipt &&
        stepItem.check &&
        !isTransactionConfirmationError &&
        (typeof stepItem.receipt === 'object' && 'status' in stepItem.receipt
          ? stepItem.receipt.status !== 'reverted'
          : true) &&
        (!stepItem.checkStatus || stepItem.checkStatus !== 'unknown')
      ) {
        //In some cases there's a race condition where an error is thrown before the steps get a chance to call
        //the callback which triggers the success event. This is a workaround to ensure the success event is triggered when
        //we have a receipt and require a fill check if we haven't already send the success event.
        const successEvent = isApproval
          ? EventNames.APPROVAL_SUCCESS
          : EventNames.DEPOSIT_SUCCESS
        if (!submittedEvents.includes(successEvent)) {
          onAnalyticEvent?.(successEvent, swapEventData)
          submittedEvents.push(successEvent)
          //To preserve the order of events we need to delay sending the fill error event but mark that we did send it to avoid duplicates
          setTimeout(() => {
            onAnalyticEvent?.(EventNames.FILL_ERROR, swapEventData)
          }, 20)
        } else {
          onAnalyticEvent?.(EventNames.FILL_ERROR, swapEventData)
        }
      } else if (
        !stepItem?.receipt ||
        (typeof stepItem.receipt === 'object' &&
          'status' in stepItem.receipt &&
          stepItem.receipt.status === 'reverted')
      ) {
        onAnalyticEvent?.(errorEvent, swapEventData)
      } else {
        onAnalyticEvent?.(EventNames.SWAP_ERROR, swapEventData)
      }

      setSwapError(errorMessage)
      onSwapError?.(errorMessage, { ...quote, steps: currentSteps } as Execute)
    }

    try {
      const swapEventData = getSwapEventData(
        quote?.details,
        quote?.fees,
        quote?.steps ? (quote?.steps as Execute['steps']) : null,
        linkedWallet?.connector,
        quoteParameters
      )
      onAnalyticEvent?.(EventNames.SWAP_CTA_CLICKED, swapEventData)
      setWaitingForSteps(true)

      if (!executeSwap) {
        throw 'Missing a quote'
      }

      if (!wallet && !walletClient.data) {
        throw 'Missing a wallet'
      }

      setSteps(quote?.steps as Execute['steps'])
      setQuoteInProgress(quote as Execute)
      setTransactionModalOpen(true)

      const _wallet =
        wallet ?? adaptViemWallet(walletClient.data as WalletClient)

      const activeWalletChainId = await _wallet?.getChainId()
      const activeWalletChain = relayClient?.chains?.find(
        (chain) => chain.id === activeWalletChainId
      )
      let targetChainId = fromToken?.chainId
      //Special case for Hyperliquid, to sign txs on an evm chain
      if (fromToken?.chainId === 1337) {
        targetChainId =
          activeWalletChain?.vmType !== 'evm' ? 1 : activeWalletChainId
      }

      if (fromToken && targetChainId && targetChainId !== activeWalletChainId) {
        onAnalyticEvent?.(EventNames.SWAP_SWITCH_NETWORK, {
          activeWalletChainId,
          ...swapEventData
        })
        await _wallet?.switchChain(targetChainId)
      }

      let _currentSteps: Execute['steps'] | undefined = undefined

      const execPromise = executeSwap(({ steps: currentSteps }) => {
        setSteps(currentSteps)
        _currentSteps = currentSteps

        const { step, stepItem } = getCurrentStep(currentSteps)
        const swapEventData = getSwapEventData(
          quote?.details,
          quote?.fees,
          currentSteps,
          linkedWallet?.connector,
          quoteParameters
        )
        if (step && stepItem) {
          //@ts-ignore
          const isApproval = step.id === 'approve' || step.id === 'approval'
          let submittedEvent = isApproval
            ? EventNames.APPROVAL_SUBMITTED
            : EventNames.DEPOSIT_SUBMITTED
          const successEvent = isApproval
            ? EventNames.APPROVAL_SUCCESS
            : EventNames.DEPOSIT_SUCCESS
          const isBatchTransaction = Boolean(
            Array.isArray(step.items) &&
              step.items.length > 1 &&
              wallet?.handleBatchTransactionStep
          )
          if (!isApproval && isBatchTransaction) {
            submittedEvent = EventNames.BATCH_TX_SUBMITTED
          }
          if (
            !submittedEvents.includes(submittedEvent) &&
            !stepItem.receipt &&
            stepItem?.txHashes &&
            stepItem?.txHashes?.length > 0
          ) {
            submittedEvents.push(submittedEvent)
            onAnalyticEvent?.(submittedEvent, swapEventData)
          } else if (
            (!submittedEvents.includes(successEvent) &&
              stepItem.receipt &&
              !(
                typeof stepItem.receipt === 'object' &&
                'status' in stepItem.receipt &&
                stepItem.receipt.status === 'reverted'
              )) ||
            stepItem.checkStatus === 'pending'
          ) {
            onAnalyticEvent?.(successEvent, swapEventData)
            submittedEvents.push(successEvent)
          }

          if (
            stepItem.status === 'complete' &&
            stepItem.check &&
            !submittedEvents.includes(EventNames.FILL_SUCCESS)
          ) {
            //Sometimes a fill may be quicker than the tx receipt is available, so we need to handle this scenario
            if (
              !submittedEvents.includes(EventNames.DEPOSIT_SUCCESS) &&
              !isBatchTransaction
            ) {
              onAnalyticEvent?.(EventNames.DEPOSIT_SUCCESS, swapEventData)
              submittedEvents.push(EventNames.DEPOSIT_SUCCESS)
              //To preserve the order of events we need to delay sending the fill success event but mark that we did send it to avoid duplicates
              setTimeout(() => {
                onAnalyticEvent?.(EventNames.FILL_SUCCESS, swapEventData)
              }, 20)
            } else {
              onAnalyticEvent?.(EventNames.FILL_SUCCESS, swapEventData)
            }
            submittedEvents.push(EventNames.FILL_SUCCESS)
          }
        } else if (
          currentSteps?.every((step) =>
            step.items?.every((item) => item.status === 'complete')
          ) &&
          !submittedEvents.includes(EventNames.FILL_SUCCESS)
        ) {
          //Sometimes a fill may be quicker than the tx receipt is available, so we need to handle this scenario
          if (
            !submittedEvents.includes(EventNames.DEPOSIT_SUCCESS) &&
            !submittedEvents.includes(EventNames.BATCH_TX_SUBMITTED)
          ) {
            onAnalyticEvent?.(EventNames.DEPOSIT_SUCCESS, swapEventData)
            submittedEvents.push(EventNames.DEPOSIT_SUCCESS)
            //To preserve the order of events we need to delay sending the fill success event but mark that we did send it to avoid duplicates
            setTimeout(() => {
              onAnalyticEvent?.(EventNames.FILL_SUCCESS, swapEventData)
            }, 20)
          } else {
            onAnalyticEvent?.(EventNames.FILL_SUCCESS, swapEventData)
          }
          submittedEvents.push(EventNames.FILL_SUCCESS)
        }
      })

      // Store the AbortController for potential cancellation immediately
      if (
        execPromise &&
        typeof execPromise === 'object' &&
        'abortController' in execPromise
      ) {
        setAbortController((execPromise as any).abortController)
      }

      execPromise
        ?.catch((error: any) => {
          swapErrorHandler(error, _currentSteps)
        })
        .finally(() => {
          setWaitingForSteps(false)
          setAbortController(null)
          invalidateBalanceQueries()
        })
    } catch (error: any) {
      swapErrorHandler(error)
      setWaitingForSteps(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    relayClient,
    address,
    connector,
    wallet,
    walletClient,
    fromToken,
    toToken,
    customToAddress,
    recipient,
    debouncedInputAmountValue,
    debouncedOutputAmountValue,
    tradeType,
    useExternalLiquidity,
    waitingForSteps,
    executeSwap,
    setSteps,
    setQuoteInProgress,
    invalidateBalanceQueries,
    linkedWallet,
    abortController
  ])

  return (
    <>
      {children({
        quote,
        steps,
        setSteps,
        swap,
        transactionModalOpen,
        feeBreakdown,
        fromToken,
        setFromToken,
        toToken,
        setToToken,
        swapError,
        error,
        toDisplayName,
        address,
        recipient,
        customToAddress,
        setCustomToAddress,
        tradeType,
        setTradeType,
        details,
        isSameCurrencySameRecipientSwap,
        debouncedInputAmountValue,
        debouncedAmountInputControls,
        setAmountInputValue,
        amountInputValue,
        amountOutputValue,
        debouncedOutputAmountValue,
        debouncedAmountOutputControls,
        setAmountOutputValue,
        toBalance,
        toBalancePending,
        isLoadingToBalance,
        isFetchingQuote,
        isLoadingFromBalance,
        fromBalance,
        fromBalancePending,
        highRelayerServiceFee,
        relayerFeeProportion,
        hasInsufficientBalance,
        isInsufficientLiquidityError,
        isCapacityExceededError,
        isCouldNotExecuteError,
        ctaCopy,
        isFromNative,
        useExternalLiquidity,
        slippageTolerance: currentSlippageTolerance,
        supportsExternalLiquidity,
        timeEstimate,
        canonicalTimeEstimate,
        fetchingExternalLiquiditySupport: externalLiquiditySupport.isFetching,
        isSvmSwap,
        isBvmSwap,
        isValidFromAddress,
        isValidToAddress,
        supportedWalletVMs,
        fromChainWalletVMSupported,
        toChainWalletVMSupported,
        isRecipientLinked,
        recipientWalletSupportsChain,
        gasTopUpEnabled,
        setGasTopUpEnabled,
        gasTopUpRequired,
        gasTopUpAmount,
        gasTopUpAmountUsd,
        invalidateBalanceQueries,
        invalidateQuoteQuery,
        setUseExternalLiquidity,
        setDetails,
        setSwapError,
        quoteInProgress,
        setQuoteInProgress,
        linkedWallet,
        quoteParameters,
        abortController,
        fromTokenPriceData,
        toTokenPriceData,
        isLoadingFromTokenPrice,
        isLoadingToTokenPrice
      })}
    </>
  )
}

export default SwapWidgetRenderer
