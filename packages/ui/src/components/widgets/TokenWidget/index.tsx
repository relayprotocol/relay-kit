import { Flex, Button, Text } from '../../primitives/index.js'
import { TabsRoot, TabsList, TabsTrigger } from '../../primitives/Tabs.js'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC
} from 'react'
import { useRelayClient } from '../../../hooks/index.js'
import type { Address } from 'viem'
import { formatUnits } from 'viem'
import { usePublicClient } from 'wagmi'
import type { LinkedWallet, Token } from '../../../types/index.js'
import type { ChainVM, Execute, RelayChain } from '@relayprotocol/relay-sdk'
import { EventNames } from '../../../constants/events.js'
import WidgetContainer from '../WidgetContainer.js'
import type { AdaptedWallet } from '@relayprotocol/relay-sdk'
import { findSupportedWallet } from '../../../utils/address.js'
import { ProviderOptionsContext } from '../../../providers/RelayKitProvider.js'
import { findBridgableToken } from '../../../utils/tokens.js'
import { UnverifiedTokenModal } from '../../common/UnverifiedTokenModal.js'
import { alreadyAcceptedToken } from '../../../utils/localStorage.js'
import { calculateUsdValue, getSwapEventData } from '../../../utils/quote.js'
import { getFeeBufferAmount } from '../../../utils/nativeMaxAmount.js'
import TokenWidgetRenderer, { type TradeType } from './TokenWidgetRenderer.js'
import BuyTabContent from './BuyTabContent.js'
import SellTabContent from './SellTabContent.js'
import { useTokenList } from '@relayprotocol/relay-kit-hooks'
import { ASSETS_RELAY_API } from '@relayprotocol/relay-sdk'

type BaseTokenWidgetProps = {
  fromToken?: Token
  setFromToken?: (token?: Token) => void
  toToken?: Token
  setToToken?: (token?: Token) => void
  // New props for automatic token resolution
  defaultFromTokenAddress?: string
  defaultFromTokenChainId?: number
  defaultToTokenAddress?: string
  defaultToTokenChainId?: number
  defaultToAddress?: Address
  defaultAmount?: string
  defaultTradeType?: 'EXACT_INPUT' | 'EXPECTED_OUTPUT'
  slippageTolerance?: string
  lockToToken?: boolean
  lockFromToken?: boolean
  lockChainId?: number
  singleChainMode?: boolean
  wallet?: AdaptedWallet
  supportedWalletVMs: Omit<ChainVM, 'hypevm'>[]
  disableInputAutoFocus?: boolean
  popularChainIds?: number[]
  disablePasteWalletAddressOption?: boolean
  sponsoredTokens?: string[]
  onOpenSlippageConfig?: () => void
  onFromTokenChange?: (token?: Token) => void
  onToTokenChange?: (token?: Token) => void
  onConnectWallet?: () => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onSwapValidating?: (data: Execute) => void
  onSwapSuccess?: (data: Execute) => void
  onSwapError?: (error: string, data?: Execute) => void
}

type MultiWalletDisabledProps = BaseTokenWidgetProps & {
  multiWalletSupportEnabled?: false
  linkedWallets?: never
  onSetPrimaryWallet?: never
  onLinkNewWallet?: never
}

type MultiWalletEnabledProps = BaseTokenWidgetProps & {
  multiWalletSupportEnabled: true
  linkedWallets: LinkedWallet[]
  onSetPrimaryWallet?: (address: string) => void
  onLinkNewWallet: (params: {
    chain?: RelayChain
    direction: 'to' | 'from'
  }) => Promise<LinkedWallet> | void
}

export type TokenWidgetProps =
  | MultiWalletDisabledProps
  | MultiWalletEnabledProps

const TokenWidget: FC<TokenWidgetProps> = ({
  fromToken,
  setFromToken,
  toToken,
  setToToken,
  defaultFromTokenAddress,
  defaultFromTokenChainId,
  defaultToTokenAddress,
  defaultToTokenChainId,
  defaultToAddress,
  defaultAmount,
  defaultTradeType,
  slippageTolerance,
  onOpenSlippageConfig,
  lockToToken = false,
  lockFromToken = false,
  lockChainId,
  singleChainMode = false,
  wallet,
  multiWalletSupportEnabled = false,
  linkedWallets,
  supportedWalletVMs,
  disableInputAutoFocus = false,
  popularChainIds,
  disablePasteWalletAddressOption,
  sponsoredTokens,
  onSetPrimaryWallet,
  onLinkNewWallet,
  onFromTokenChange,
  onToTokenChange,
  onConnectWallet,
  onAnalyticEvent: _onAnalyticEvent,
  onSwapSuccess,
  onSwapValidating,
  onSwapError
}) => {
  const onAnalyticEvent = useCallback(
    (eventName: string, data?: any) => {
      try {
        _onAnalyticEvent?.(eventName, data)
      } catch (e) {
        console.error('Error in onAnalyticEvent', eventName, data, e)
      }
    },
    [_onAnalyticEvent]
  )
  const relayClient = useRelayClient()
  const providerOptionsContext = useContext(ProviderOptionsContext)
  const connectorKeyOverrides = providerOptionsContext.vmConnectorKeyOverrides
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)
  const [depositAddressModalOpen, setDepositAddressModalOpen] = useState(false)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [pendingSuccessFlush, setPendingSuccessFlush] = useState(false)
  const [unverifiedTokens, setUnverifiedTokens] = useState<
    { token: Token; context: 'to' | 'from' }[]
  >([])
  const [isUsdInputMode, setIsUsdInputMode] = useState(false)
  const [usdInputValue, setUsdInputValue] = useState('')
  const [usdOutputValue, setUsdOutputValue] = useState('')
  const [tokenInputCache, setTokenInputCache] = useState('')
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const setTradeTypeRef = useRef<((tradeType: TradeType) => void) | null>(null)
  const tradeTypeRef = useRef<TradeType>(defaultTradeType ?? 'EXPECTED_OUTPUT')

  // Token resolution from address/chainId
  const [resolvedFromToken, setResolvedFromToken] = useState<Token | undefined>(
    fromToken
  )
  const [resolvedToToken, setResolvedToToken] = useState<Token | undefined>(
    toToken
  )

  const hasLockedToken = lockFromToken || lockToToken
  const isSingleChainLocked = singleChainMode && lockChainId !== undefined
  const [localSlippageTolerance, setLocalSlippageTolerance] = useState<
    string | undefined
  >(slippageTolerance)

  // Query for fromToken if address/chainId provided but no token object
  const { data: fromTokenList } = useTokenList(
    relayClient?.baseApiUrl,
    defaultFromTokenAddress && defaultFromTokenChainId && !fromToken
      ? {
          chainIds: [defaultFromTokenChainId],
          address: defaultFromTokenAddress,
          limit: 1
        }
      : undefined,
    {
      enabled: !!(
        defaultFromTokenAddress &&
        defaultFromTokenChainId &&
        !fromToken &&
        relayClient
      )
    }
  )

  // Query for toToken if address/chainId provided but no token object
  const { data: toTokenList } = useTokenList(
    relayClient?.baseApiUrl,
    defaultToTokenAddress && defaultToTokenChainId && !toToken
      ? {
          chainIds: [defaultToTokenChainId],
          address: defaultToTokenAddress,
          limit: 1
        }
      : undefined,
    {
      enabled: !!(
        defaultToTokenAddress &&
        defaultToTokenChainId &&
        !toToken &&
        relayClient
      )
    }
  )

  // Resolve fromToken from API response
  useEffect(() => {
    if (fromToken) {
      setResolvedFromToken(fromToken)
    } else if (fromTokenList?.[0]) {
      const apiToken = fromTokenList[0]
      const resolved: Token = {
        chainId: apiToken.chainId!,
        address: apiToken.address!,
        name: apiToken.name!,
        symbol: apiToken.symbol!,
        decimals: apiToken.decimals!,
        logoURI:
          apiToken.metadata?.logoURI ||
          `${ASSETS_RELAY_API}/icons/currencies/${apiToken.symbol?.toLowerCase()}.png`,
        verified: apiToken.metadata?.verified ?? false
      }
      setResolvedFromToken(resolved)
      setFromToken?.(resolved)
    }
  }, [fromToken, fromTokenList, setFromToken])

  // Resolve toToken from API response
  useEffect(() => {
    if (toToken) {
      setResolvedToToken(toToken)
    } else if (toTokenList?.[0]) {
      const apiToken = toTokenList[0]
      const resolved: Token = {
        chainId: apiToken.chainId!,
        address: apiToken.address!,
        name: apiToken.name!,
        symbol: apiToken.symbol!,
        decimals: apiToken.decimals!,
        logoURI:
          apiToken.metadata?.logoURI ||
          `${ASSETS_RELAY_API}/icons/currencies/${apiToken.symbol?.toLowerCase()}.png`,
        verified: apiToken.metadata?.verified ?? false
      }
      setResolvedToToken(resolved)
      setToToken?.(resolved)
    }
  }, [toToken, toTokenList, setToToken])

  useEffect(() => {
    setLocalSlippageTolerance(slippageTolerance)
  }, [slippageTolerance])

  useEffect(() => {
    const desiredTradeType: TradeType =
      activeTab === 'buy' ? 'EXPECTED_OUTPUT' : 'EXACT_INPUT'

    if (tradeTypeRef.current !== desiredTradeType) {
      setTradeTypeRef.current?.(desiredTradeType)
    }
  }, [activeTab])

  const handleOpenSlippageConfig = () => {
    onOpenSlippageConfig?.()
  }

  const handleSlippageToleranceChange = (value: string | undefined) => {
    setLocalSlippageTolerance(value)
  }

  const computedDefaultTradeType: TradeType =
    defaultTradeType ??
    (activeTab === 'buy' ? 'EXPECTED_OUTPUT' : 'EXACT_INPUT')

  //Handle external unverified tokens
  useEffect(() => {
    if (
      resolvedFromToken &&
      'verified' in resolvedFromToken &&
      !resolvedFromToken.verified
    ) {
      const isAlreadyAccepted = alreadyAcceptedToken(resolvedFromToken)
      if (!isAlreadyAccepted) {
        unverifiedTokens.push({ token: resolvedFromToken, context: 'from' })
        setResolvedFromToken(undefined)
        setFromToken?.(undefined)
      }
    }
    if (
      resolvedToToken &&
      'verified' in resolvedToToken &&
      !resolvedToToken.verified
    ) {
      const isAlreadyAccepted = alreadyAcceptedToken(resolvedToToken)
      if (!isAlreadyAccepted) {
        unverifiedTokens.push({ token: resolvedToToken, context: 'to' })
        setResolvedToToken(undefined)
        setToToken?.(undefined)
      }
    }
  }, [resolvedFromToken, resolvedToToken])

  return (
    <TokenWidgetRenderer
      context="Swap"
      transactionModalOpen={transactionModalOpen}
      setTransactionModalOpen={setTransactionModalOpen}
      depositAddressModalOpen={depositAddressModalOpen}
      defaultAmount={defaultAmount}
      defaultToAddress={defaultToAddress}
      defaultTradeType={computedDefaultTradeType}
      toToken={resolvedToToken}
      setToToken={setResolvedToToken}
      fromToken={resolvedFromToken}
      setFromToken={setResolvedFromToken}
      slippageTolerance={localSlippageTolerance}
      wallet={wallet}
      linkedWallets={linkedWallets}
      multiWalletSupportEnabled={multiWalletSupportEnabled}
      onSwapError={onSwapError}
      onAnalyticEvent={onAnalyticEvent}
      supportedWalletVMs={supportedWalletVMs}
      sponsoredTokens={sponsoredTokens}
    >
      {({
        quote,
        steps,
        swap,
        setSteps,
        feeBreakdown,
        fromToken,
        setFromToken,
        toToken,
        setToToken,
        error,
        toDisplayName,
        address,
        recipient,
        customToAddress,
        setCustomToAddress,
        tradeType,
        setTradeType,
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
        timeEstimate,
        isSvmSwap,
        isBvmSwap,
        isValidFromAddress,
        isValidToAddress,
        supportsExternalLiquidity,
        useExternalLiquidity,
        slippageTolerance,
        canonicalTimeEstimate,
        fromChainWalletVMSupported,
        toChainWalletVMSupported,
        isRecipientLinked,
        swapError,
        recipientWalletSupportsChain,
        linkedWallet,
        quoteParameters,
        setSwapError,
        setUseExternalLiquidity,
        invalidateBalanceQueries,
        invalidateQuoteQuery,
        quoteInProgress,
        setQuoteInProgress,
        abortController,
        fromTokenPriceData,
        toTokenPriceData,
        isLoadingFromTokenPrice,
        isLoadingToTokenPrice
      }) => {
        setTradeTypeRef.current = setTradeType
        tradeTypeRef.current = tradeType

        // Calculate the USD value of the input amount
        const inputAmountUsd = useMemo(() => {
          return (
            calculateUsdValue(fromTokenPriceData?.price, amountInputValue) ??
            null
          )
        }, [fromTokenPriceData, amountInputValue])

        // Calculate the USD value of the output amount
        const outputAmountUsd = useMemo(() => {
          return (
            calculateUsdValue(toTokenPriceData?.price, amountOutputValue) ??
            null
          )
        }, [toTokenPriceData, amountOutputValue])

        const percentageOptions = [20, 50]

        const handleSelectPercentage = (percent: number) => {
          if (!fromBalance || fromBalance === 0n || percent <= 0) {
            return
          }

          const percentageAmount = (fromBalance * BigInt(percent)) / 100n
          handleMaxAmountClicked(percentageAmount, `${percent}%`)
        }

        const handleSelectMax = async () => {
          if (!fromBalance || !fromToken || !fromChain) {
            return
          }

          let feeBufferAmount: bigint = 0n

          if (isFromNative) {
            feeBufferAmount = await getFeeBufferAmount(
              fromChain.vmType,
              fromChain.id,
              fromBalance,
              publicClient ?? null
            )
          }

          const finalMaxAmount =
            isFromNative && feeBufferAmount > 0n
              ? fromBalance > feeBufferAmount
                ? fromBalance - feeBufferAmount
                : 0n
              : fromBalance

          handleMaxAmountClicked(
            finalMaxAmount,
            'max',
            isFromNative ? feeBufferAmount : 0n
          )
        }

        const handleMaxAmountClicked = async (
          amount: bigint,
          percent: string,
          bufferAmount?: bigint
        ) => {
          if (fromToken) {
            const formattedAmount = formatUnits(amount, fromToken?.decimals)
            setAmountInputValue(formattedAmount)
            setTradeType('EXACT_INPUT')
            debouncedAmountOutputControls.cancel()
            debouncedAmountInputControls.flush()
            onAnalyticEvent?.(EventNames.MAX_AMOUNT_CLICKED, {
              percent: percent,
              bufferAmount: bufferAmount ? bufferAmount.toString() : '0',
              chainType: fromChain?.vmType
            })

            if (isUsdInputMode && conversionRate) {
              const numericTokenAmount = Number(formattedAmount)
              if (!isNaN(numericTokenAmount)) {
                const usdEquivalent = numericTokenAmount * conversionRate
                setUsdInputValue(usdEquivalent.toFixed(2))
              }
            }
          }
        }

        const fromChain = relayClient?.chains?.find(
          (chain) => chain.id === fromToken?.chainId
        )

        const toChain = relayClient?.chains?.find(
          (chain) => chain.id === toToken?.chainId
        )

        const tokensAreEqual = (a?: Token, b?: Token) => {
          if (!a && !b) return true
          if (!a || !b) return false
          return (
            a.chainId === b.chainId &&
            a.address?.toLowerCase() === b.address?.toLowerCase()
          )
        }

        const handleSetToToken = useCallback(
          (token?: Token) => {
            if (!token) {
              setToToken(undefined)
              onToTokenChange?.(undefined)
              return
            }

            let _token = token
            if (!fromChainWalletVMSupported) {
              const newToChain = relayClient?.chains.find(
                (chain) => token?.chainId == chain.id
              )
              if (newToChain) {
                const _toToken = findBridgableToken(newToChain, _token)
                if (_toToken && _toToken.address != _token?.address) {
                  _token = _toToken
                }
              }
            }
            setToToken(_token)
            onToTokenChange?.(_token)
          },
          [fromChainWalletVMSupported, onToTokenChange, relayClient, setToToken]
        )

        const handleSetFromToken = useCallback(
          (token?: Token) => {
            if (!token) {
              setFromToken(undefined)
              onFromTokenChange?.(undefined)
              return
            }

            let _token = token
            const newFromChain = relayClient?.chains.find(
              (chain) => token?.chainId == chain.id
            )
            if (
              newFromChain?.vmType &&
              !supportedWalletVMs.includes(newFromChain?.vmType)
            ) {
              setTradeType('EXACT_INPUT')

              const _toToken = findBridgableToken(toChain, toToken)

              if (_toToken && _toToken?.address != toToken?.address) {
                handleSetToToken(_toToken)
              }

              const _fromToken = findBridgableToken(newFromChain, _token)
              if (_fromToken && _fromToken.address != _token?.address) {
                _token = _fromToken
              }
            }
            setFromToken(_token)
            onFromTokenChange?.(_token)
          },
          [
            handleSetToToken,
            onFromTokenChange,
            relayClient,
            setFromToken,
            setTradeType,
            supportedWalletVMs,
            toChain,
            toToken
          ]
        )

        // Get public client for the fromChain to estimate gas
        const publicClient = usePublicClient({ chainId: fromChain?.id })

        useEffect(() => {
          if (
            multiWalletSupportEnabled &&
            fromChain &&
            address &&
            linkedWallets &&
            !isValidFromAddress
          ) {
            const supportedAddress = findSupportedWallet(
              fromChain,
              address,
              linkedWallets,
              connectorKeyOverrides
            )
            if (supportedAddress) {
              onSetPrimaryWallet?.(supportedAddress)
            }
          }

          if (
            multiWalletSupportEnabled &&
            toChain &&
            recipient &&
            linkedWallets &&
            !isValidToAddress
          ) {
            const supportedAddress = findSupportedWallet(
              toChain,
              recipient,
              linkedWallets,
              connectorKeyOverrides
            )
            if (supportedAddress) {
              setCustomToAddress(supportedAddress)
            } else {
              setCustomToAddress(undefined)
            }
          }
        }, [
          multiWalletSupportEnabled,
          fromChain?.id,
          toChain?.id,
          address,
          linkedWallets,
          onSetPrimaryWallet,
          isValidFromAddress,
          isValidToAddress,
          connectorKeyOverrides
        ])

        //Handle if the paste wallet address option is disabled while there is a custom to address
        useEffect(() => {
          if (disablePasteWalletAddressOption && customToAddress) {
            setCustomToAddress(undefined)
          }
        }, [disablePasteWalletAddressOption])

        const promptSwitchRoute =
          (isCapacityExceededError || isCouldNotExecuteError) &&
          supportsExternalLiquidity &&
          !isSingleChainLocked

        const isAutoSlippage = slippageTolerance === undefined

        const isHighPriceImpact =
          Number(quote?.details?.totalImpact?.percent) < -3.5
        const totalImpactUsd = quote?.details?.totalImpact?.usd
        const showHighPriceImpactWarning = Boolean(
          isHighPriceImpact && totalImpactUsd && Number(totalImpactUsd) <= -10
        )

        // Calculate conversion rate
        const conversionRate = useMemo(() => {
          if (isUsdInputMode) {
            // When in USD input mode, the conversion rate is the price of the fromToken.
            if (fromTokenPriceData?.price && fromTokenPriceData.price > 0) {
              return fromTokenPriceData.price
            } else {
              // If no price data, or price is 0, return null to avoid stale calculations.
              return null
            }
          } else {
            // When in token input mode, calculate rate from quote if available.
            if (
              amountInputValue &&
              Number(amountInputValue) > 0 &&
              quote?.details?.currencyIn?.amountUsd
            ) {
              const tokenVal = Number(amountInputValue)
              const usdVal = Number(quote.details.currencyIn.amountUsd)
              if (tokenVal > 0 && usdVal > 0) {
                const rate = usdVal / tokenVal
                return rate
              } else {
                return null
              }
            } else {
              // If in token mode and token input is cleared or zero, return null
              return null
            }
          }
        }, [
          isUsdInputMode,
          fromTokenPriceData?.price,
          quote?.details?.currencyIn?.amountUsd,
          amountInputValue
        ])

        // toggle between token and usd input mode
        const toggleInputMode = () => {
          if (!isUsdInputMode) {
            // Switching TO USD mode
            let newUsdInputValue = ''
            let newUsdOutputValue = ''

            // Calculate USD input value
            if (
              quote?.details?.currencyIn?.amountUsd &&
              Number(quote.details.currencyIn.amountUsd) > 0
            ) {
              newUsdInputValue = String(
                Number(quote.details.currencyIn.amountUsd)
              )
            } else if (inputAmountUsd && inputAmountUsd > 0) {
              newUsdInputValue = inputAmountUsd.toFixed(2)
            } else if (
              amountInputValue &&
              Number(amountInputValue) > 0 &&
              conversionRate &&
              conversionRate > 0
            ) {
              newUsdInputValue = (
                Number(amountInputValue) * conversionRate
              ).toFixed(2)
            }

            // Calculate USD output value
            if (
              quote?.details?.currencyOut?.amountUsd &&
              Number(quote.details.currencyOut.amountUsd) > 0
            ) {
              newUsdOutputValue = String(
                Number(quote.details.currencyOut.amountUsd)
              )
            } else if (outputAmountUsd && outputAmountUsd > 0) {
              newUsdOutputValue = outputAmountUsd.toFixed(2)
            } else if (
              amountOutputValue &&
              Number(amountOutputValue) > 0 &&
              toTokenPriceData?.price &&
              toTokenPriceData.price > 0
            ) {
              newUsdOutputValue = (
                Number(amountOutputValue) * toTokenPriceData.price
              ).toFixed(2)
            }

            setTokenInputCache(amountInputValue)
            setUsdInputValue(newUsdInputValue)
            setUsdOutputValue(newUsdOutputValue)
            setIsUsdInputMode(true)

            // Default to EXACT_INPUT unless we're currently in EXPECTED_OUTPUT mode with a valid USD output value
            if (tradeType !== 'EXPECTED_OUTPUT' || !newUsdOutputValue) {
              setTradeType('EXACT_INPUT')
            }
          } else {
            // Switching FROM USD mode
            if (!usdInputValue && tokenInputCache) {
              setAmountInputValue(tokenInputCache)
            }
            setUsdInputValue('')
            setUsdOutputValue('')
            setIsUsdInputMode(false)
            // Maintain current trade type when switching back to token mode
          }
        }

        //Update token input value when USD input changes in USD mode
        useEffect(() => {
          if (isUsdInputMode) {
            if (conversionRate && conversionRate > 0 && usdInputValue) {
              const usdValue = Number(usdInputValue)
              if (!isNaN(usdValue) && usdValue > 0) {
                const tokenEquivalent = (usdValue / conversionRate).toFixed(
                  fromToken?.decimals ?? 8
                )
                setAmountInputValue(tokenEquivalent)
              }
            } else if (usdInputValue === '' || Number(usdInputValue) === 0) {
              setAmountInputValue('')
            }
          }
        }, [
          isUsdInputMode,
          usdInputValue,
          conversionRate,
          setAmountInputValue,
          fromToken?.decimals
        ])

        //Update token output value when USD output changes in USD mode
        useEffect(() => {
          if (isUsdInputMode && tradeType === 'EXPECTED_OUTPUT') {
            if (
              toTokenPriceData?.price &&
              toTokenPriceData.price > 0 &&
              usdOutputValue
            ) {
              const usdValue = Number(usdOutputValue)
              if (!isNaN(usdValue) && usdValue > 0) {
                const tokenEquivalent = (
                  usdValue / toTokenPriceData.price
                ).toFixed(toToken?.decimals ?? 8)
                setAmountOutputValue(tokenEquivalent)
              }
            } else if (usdOutputValue === '' || Number(usdOutputValue) === 0) {
              setAmountOutputValue('')
            }
          }
        }, [
          isUsdInputMode,
          tradeType,
          usdOutputValue,
          toTokenPriceData?.price,
          setAmountOutputValue,
          toToken?.decimals
        ])

        //Update USD output value when in USD mode
        useEffect(() => {
          if (isUsdInputMode) {
            // For EXPECTED_OUTPUT, don't override user's typed value
            if (tradeType === 'EXPECTED_OUTPUT') {
              // User is controlling the output value directly
              return
            }

            // For EXACT_INPUT, update based on quote or calculations
            if (quote?.details?.currencyOut?.amountUsd && !isFetchingQuote) {
              // Use quote USD value when available
              const quoteUsdValue = Number(quote.details.currencyOut.amountUsd)
              if (!isNaN(quoteUsdValue) && quoteUsdValue >= 0) {
                setUsdOutputValue(quoteUsdValue.toFixed(2))
              }
            } else if (
              toTokenPriceData?.price &&
              toTokenPriceData.price > 0 &&
              amountOutputValue &&
              Number(amountOutputValue) > 0
            ) {
              // Fallback to direct token price calculation
              const tokenAmount = Number(amountOutputValue)
              const usdEquivalent = tokenAmount * toTokenPriceData.price
              if (!isNaN(usdEquivalent) && usdEquivalent >= 0) {
                setUsdOutputValue(usdEquivalent.toFixed(2))
              }
            } else if (!amountOutputValue || Number(amountOutputValue) === 0) {
              setUsdOutputValue('')
            }
          }
        }, [
          isUsdInputMode,
          tradeType,
          quote?.details?.currencyOut?.amountUsd,
          isFetchingQuote,
          toTokenPriceData?.price,
          amountOutputValue
        ])

        //Update USD input value when in EXPECTED_OUTPUT mode
        useEffect(() => {
          if (isUsdInputMode && tradeType === 'EXPECTED_OUTPUT') {
            if (quote?.details?.currencyIn?.amountUsd && !isFetchingQuote) {
              // Use quote USD value when available
              const quoteUsdValue = Number(quote.details.currencyIn.amountUsd)
              if (!isNaN(quoteUsdValue) && quoteUsdValue >= 0) {
                setUsdInputValue(quoteUsdValue.toFixed(2))
              }
            } else if (!amountInputValue || Number(amountInputValue) === 0) {
              setUsdInputValue('')
            }
          }
        }, [
          isUsdInputMode,
          tradeType,
          quote?.details?.currencyIn?.amountUsd,
          isFetchingQuote,
          amountInputValue
        ])

        const recipientLinkedWallet = linkedWallets?.find(
          (wallet) => wallet.address === recipient
        )

        const handlePrimaryAction = () => {
          if (fromChainWalletVMSupported) {
            if (!isValidToAddress || !isValidFromAddress) {
              if (
                multiWalletSupportEnabled &&
                (isValidToAddress ||
                  (!isValidToAddress && toChainWalletVMSupported))
              ) {
                const chain = !isValidFromAddress ? fromChain : toChain
                if (!address) {
                  onConnectWallet?.()
                } else {
                  onLinkNewWallet?.({
                    chain,
                    direction: !isValidFromAddress ? 'from' : 'to'
                  })?.then((wallet) => {
                    if (!isValidFromAddress) {
                      onSetPrimaryWallet?.(wallet.address)
                    } else {
                      setCustomToAddress(wallet.address)
                    }
                  })
                }
              } else {
                setAddressModalOpen(true)
              }
            } else {
              swap()
            }
          } else {
            if (!isValidToAddress) {
              if (multiWalletSupportEnabled && toChainWalletVMSupported) {
                if (!address) {
                  onConnectWallet?.()
                } else {
                  onLinkNewWallet?.({
                    chain: toChain,
                    direction: 'to'
                  })?.then((wallet) => {
                    setCustomToAddress(wallet.address)
                  })
                }
              } else {
                setAddressModalOpen(true)
              }
            } else {
              const swapEventData = getSwapEventData(
                quote?.details,
                quote?.fees,
                quote?.steps ? (quote?.steps as Execute['steps']) : null,
                linkedWallet?.connector,
                quoteParameters
              )
              onAnalyticEvent?.(EventNames.SWAP_CTA_CLICKED, swapEventData)
              setDepositAddressModalOpen(true)
            }
          }
        }

        return (
          <>
            <WidgetContainer
              steps={steps}
              setSteps={setSteps}
              quoteInProgress={quoteInProgress}
              setQuoteInProgress={setQuoteInProgress}
              transactionModalOpen={transactionModalOpen}
              setTransactionModalOpen={setTransactionModalOpen}
              depositAddressModalOpen={depositAddressModalOpen}
              setDepositAddressModalOpen={setDepositAddressModalOpen}
              addressModalOpen={addressModalOpen}
              setAddressModalOpen={setAddressModalOpen}
              fromToken={fromToken}
              fromChain={fromChain}
              toToken={toToken}
              toChain={toChain}
              address={address}
              recipient={recipient}
              amountInputValue={amountInputValue}
              amountOutputValue={amountOutputValue}
              debouncedInputAmountValue={debouncedInputAmountValue}
              debouncedOutputAmountValue={debouncedOutputAmountValue}
              tradeType={tradeType}
              onTransactionModalOpenChange={(open) => {
                if (!open) {
                  if (pendingSuccessFlush) {
                    setPendingSuccessFlush(false)
                  } else if (steps) {
                    invalidateQuoteQuery()
                  }
                  // Abort ongoing execution
                  if (abortController) {
                    abortController.abort()
                  }
                  setSwapError(null)
                  setSteps(null)
                  setQuoteInProgress(null)
                } else if (pendingSuccessFlush) {
                  setPendingSuccessFlush(false)
                }
              }}
              onDepositAddressModalOpenChange={(open) => {
                if (!open) {
                  setSwapError(null)
                  if (pendingSuccessFlush) {
                    setPendingSuccessFlush(false)
                  } else {
                    invalidateQuoteQuery()
                  }
                } else if (pendingSuccessFlush) {
                  setPendingSuccessFlush(false)
                }
              }}
              useExternalLiquidity={useExternalLiquidity}
              slippageTolerance={localSlippageTolerance}
              swapError={swapError}
              setSwapError={setSwapError}
              onSwapSuccess={(data) => {
                setPendingSuccessFlush(true)
                setAmountInputValue('')
                setAmountOutputValue('')
                onSwapSuccess?.(data)
              }}
              onSwapValidating={onSwapValidating}
              onAnalyticEvent={onAnalyticEvent}
              invalidateBalanceQueries={invalidateBalanceQueries}
              invalidateQuoteQuery={invalidateQuoteQuery}
              customToAddress={customToAddress}
              setCustomToAddress={setCustomToAddress}
              timeEstimate={timeEstimate}
              wallet={wallet}
              linkedWallets={linkedWallets}
              multiWalletSupportEnabled={multiWalletSupportEnabled}
            >
              {() => {
                return (
                  <Flex direction="column" css={{ gap: '3', width: '100%' }}>
                    <TabsRoot
                      value={activeTab}
                      onValueChange={(value) => {
                        const nextTab = value as 'buy' | 'sell'
                        setActiveTab(nextTab)
                        const desiredTradeType: TradeType =
                          nextTab === 'buy' ? 'EXPECTED_OUTPUT' : 'EXACT_INPUT'

                        if (tradeType !== desiredTradeType) {
                          setTradeType(desiredTradeType)
                        }

                        onAnalyticEvent?.('TAB_SWITCHED', {
                          tab: value
                        })
                      }}
                    >
                      <Flex
                        direction="column"
                        css={{
                          width: '100%',
                          overflow: 'hidden',
                          border: 'widget-border',
                          minWidth: 300,
                          maxWidth: 408
                        }}
                      >
                        <TabsList>
                          <TabsTrigger
                            value="buy"
                            css={{
                              padding: '12px',
                              background: 'none',
                              transition: 'background 0.2s ease-in-out',
                              outline: '1px solid transparent',
                              '&[data-state="active"]': {
                                background: 'white',
                                borderRadius: '12px',
                                '--outlineColor': 'colors.gray.4',
                                outline: '1px solid var(--outlineColor)'
                              },
                              '&:not([data-state="active"])': {
                                _hover: {
                                  backgroundColor: 'transparent !important'
                                }
                              },
                              _dark: {
                                '&[data-state="active"]': {
                                  background: 'gray1'
                                },
                                '&:not([data-state="active"])': {
                                  _hover: {
                                    backgroundColor: 'transparent !important'
                                  }
                                }
                              }
                            }}
                          >
                            <Text style="subtitle1">Buy</Text>
                          </TabsTrigger>
                          <TabsTrigger
                            value="sell"
                            css={{
                              padding: '12px',
                              background: 'none',
                              transition: 'background 0.2s ease-in-out',
                              outline: '1px solid transparent',
                              '&[data-state="active"]': {
                                background: 'white',
                                borderRadius: '12px',
                                '--outlineColor': 'colors.gray.4',
                                outline: '1px solid var(--outlineColor)'
                              },
                              '&:not([data-state="active"])': {
                                _hover: {
                                  backgroundColor: 'transparent !important'
                                }
                              },
                              _dark: {
                                '&[data-state="active"]': {
                                  background: 'gray1'
                                },
                                '&:not([data-state="active"])': {
                                  _hover: {
                                    backgroundColor: 'transparent !important'
                                  }
                                }
                              }
                            }}
                          >
                            Sell
                          </TabsTrigger>
                        </TabsList>

                        <BuyTabContent
                          slippageTolerance={localSlippageTolerance}
                          onOpenSlippageConfig={handleOpenSlippageConfig}
                          onSlippageToleranceChange={
                            handleSlippageToleranceChange
                          }
                          isUsdInputMode={isUsdInputMode}
                          usdOutputValue={usdOutputValue}
                          tradeType={tradeType}
                          amountOutputValue={amountOutputValue}
                          amountInputValue={amountInputValue}
                          toToken={toToken}
                          fromToken={fromToken}
                          quote={quote}
                          isFetchingQuote={isFetchingQuote}
                          isLoadingToTokenPrice={isLoadingToTokenPrice}
                          outputAmountUsd={outputAmountUsd}
                          toTokenPriceData={toTokenPriceData}
                          setUsdOutputValue={setUsdOutputValue}
                          setTradeType={setTradeType}
                          setAmountOutputValue={setAmountOutputValue}
                          setAmountInputValue={setAmountInputValue}
                          debouncedAmountOutputControls={
                            debouncedAmountOutputControls
                          }
                          setUsdInputValue={setUsdInputValue}
                          toggleInputMode={toggleInputMode}
                          onAnalyticEvent={onAnalyticEvent}
                          feeBreakdown={feeBreakdown}
                          isLoadingFromBalance={isLoadingFromBalance}
                          fromBalance={fromBalance}
                          fromBalancePending={fromBalancePending}
                          toBalance={toBalance}
                          isLoadingToBalance={isLoadingToBalance}
                          toBalancePending={toBalancePending}
                          address={address}
                          timeEstimate={timeEstimate}
                          multiWalletSupportEnabled={multiWalletSupportEnabled}
                          toChainWalletVMSupported={toChainWalletVMSupported}
                          disablePasteWalletAddressOption={
                            disablePasteWalletAddressOption
                          }
                          recipient={recipient}
                          setCustomToAddress={setCustomToAddress}
                          onConnectWallet={onConnectWallet}
                          onLinkNewWallet={onLinkNewWallet}
                          linkedWallets={linkedWallets}
                          fromChain={fromChain}
                          toChain={toChain}
                          isValidToAddress={isValidToAddress}
                          isRecipientLinked={isRecipientLinked}
                          setAddressModalOpen={setAddressModalOpen}
                          toDisplayName={toDisplayName}
                          isValidFromAddress={isValidFromAddress}
                          fromChainWalletVMSupported={
                            fromChainWalletVMSupported
                          }
                          supportedWalletVMs={supportedWalletVMs}
                          handleSetFromToken={handleSetFromToken}
                          handleSetToToken={handleSetToToken}
                          onSetPrimaryWallet={onSetPrimaryWallet}
                          lockToToken={lockToToken}
                          lockFromToken={lockFromToken}
                          isSingleChainLocked={isSingleChainLocked}
                          lockChainId={lockChainId}
                          popularChainIds={popularChainIds}
                          transactionModalOpen={transactionModalOpen}
                          depositAddressModalOpen={depositAddressModalOpen}
                          hasInsufficientBalance={hasInsufficientBalance}
                          isInsufficientLiquidityError={
                            isInsufficientLiquidityError
                          }
                          recipientWalletSupportsChain={
                            recipientWalletSupportsChain
                          }
                          isSameCurrencySameRecipientSwap={
                            isSameCurrencySameRecipientSwap
                          }
                          debouncedInputAmountValue={debouncedInputAmountValue}
                          debouncedOutputAmountValue={
                            debouncedOutputAmountValue
                          }
                          showHighPriceImpactWarning={
                            showHighPriceImpactWarning
                          }
                          disableSwapButton={promptSwitchRoute}
                          onPrimaryAction={handlePrimaryAction}
                          error={error}
                          relayerFeeProportion={relayerFeeProportion}
                          highRelayerServiceFee={highRelayerServiceFee}
                          isCapacityExceededError={isCapacityExceededError}
                          isCouldNotExecuteError={isCouldNotExecuteError}
                          supportsExternalLiquidity={supportsExternalLiquidity}
                          recipientLinkedWallet={recipientLinkedWallet}
                          toChainVmType={toChain?.vmType}
                          ctaCopy={ctaCopy}
                        />

                        <SellTabContent
                          slippageTolerance={localSlippageTolerance}
                          onOpenSlippageConfig={handleOpenSlippageConfig}
                          onSlippageToleranceChange={
                            handleSlippageToleranceChange
                          }
                          disableInputAutoFocus={disableInputAutoFocus}
                          isUsdInputMode={isUsdInputMode}
                          usdInputValue={usdInputValue}
                          tradeType={tradeType}
                          amountInputValue={amountInputValue}
                          amountOutputValue={amountOutputValue}
                          conversionRate={conversionRate}
                          fromToken={fromToken}
                          toToken={toToken}
                          quote={quote}
                          isFetchingQuote={isFetchingQuote}
                          inputAmountUsd={inputAmountUsd}
                          fromTokenPriceData={fromTokenPriceData}
                          isLoadingFromTokenPrice={isLoadingFromTokenPrice}
                          toggleInputMode={toggleInputMode}
                          setUsdInputValue={setUsdInputValue}
                          setTradeType={setTradeType}
                          setTokenInputCache={setTokenInputCache}
                          setAmountInputValue={setAmountInputValue}
                          setAmountOutputValue={setAmountOutputValue}
                          setUsdOutputValue={setUsdOutputValue}
                          debouncedAmountInputControls={
                            debouncedAmountInputControls
                          }
                          onAnalyticEvent={onAnalyticEvent}
                          feeBreakdown={feeBreakdown}
                          onPrimaryAction={handlePrimaryAction}
                          fromBalance={fromBalance}
                          isLoadingFromBalance={isLoadingFromBalance}
                          toBalance={toBalance}
                          isLoadingToBalance={isLoadingToBalance}
                          toBalancePending={toBalancePending}
                          hasInsufficientBalance={hasInsufficientBalance}
                          address={address}
                          timeEstimate={timeEstimate}
                          fromBalancePending={fromBalancePending}
                          multiWalletSupportEnabled={multiWalletSupportEnabled}
                          fromChainWalletVMSupported={
                            fromChainWalletVMSupported
                          }
                          disablePasteWalletAddressOption={
                            disablePasteWalletAddressOption
                          }
                          onSetPrimaryWallet={onSetPrimaryWallet}
                          fromChain={fromChain}
                          toChain={toChain}
                          onConnectWallet={onConnectWallet}
                          onLinkNewWallet={onLinkNewWallet}
                          linkedWallets={linkedWallets}
                          setAddressModalOpen={setAddressModalOpen}
                          transactionModalOpen={transactionModalOpen}
                          depositAddressModalOpen={depositAddressModalOpen}
                          isValidFromAddress={isValidFromAddress}
                          isValidToAddress={isValidToAddress}
                          toChainWalletVMSupported={toChainWalletVMSupported}
                          isInsufficientLiquidityError={
                            isInsufficientLiquidityError
                          }
                          recipientWalletSupportsChain={
                            recipientWalletSupportsChain
                          }
                          toDisplayName={toDisplayName}
                          recipient={recipient}
                          setCustomToAddress={setCustomToAddress}
                          isRecipientLinked={isRecipientLinked}
                          isSameCurrencySameRecipientSwap={
                            isSameCurrencySameRecipientSwap
                          }
                          debouncedInputAmountValue={debouncedInputAmountValue}
                          debouncedOutputAmountValue={
                            debouncedOutputAmountValue
                          }
                          showHighPriceImpactWarning={
                            showHighPriceImpactWarning
                          }
                          disableSwapButton={promptSwitchRoute}
                          percentOptions={percentageOptions}
                          onSelectPercentage={handleSelectPercentage}
                          onSelectMax={handleSelectMax}
                          supportedWalletVMs={supportedWalletVMs}
                          lockToToken={lockToToken}
                          lockFromToken={lockFromToken}
                          isSingleChainLocked={isSingleChainLocked}
                          lockChainId={lockChainId}
                          popularChainIds={popularChainIds}
                          handleSetFromToken={handleSetFromToken}
                          handleSetToToken={handleSetToToken}
                          error={error}
                          relayerFeeProportion={relayerFeeProportion}
                          highRelayerServiceFee={highRelayerServiceFee}
                          isCapacityExceededError={isCapacityExceededError}
                          isCouldNotExecuteError={isCouldNotExecuteError}
                          supportsExternalLiquidity={supportsExternalLiquidity}
                          recipientLinkedWallet={recipientLinkedWallet}
                          toChainVmType={toChain?.vmType}
                          ctaCopy={ctaCopy}
                        />

                        {promptSwitchRoute ? (
                          <Button
                            color="primary"
                            cta={true}
                            css={{ flexGrow: '1', justifyContent: 'center' }}
                            onClick={() => {
                              setUseExternalLiquidity(true)
                              onAnalyticEvent?.(
                                EventNames.CTA_SWITCH_ROUTE_CLICKED
                              )
                            }}
                          >
                            Switch Route
                          </Button>
                        ) : null}
                      </Flex>
                    </TabsRoot>
                  </Flex>
                )
              }}
            </WidgetContainer>
            <UnverifiedTokenModal
              open={unverifiedTokens.length > 0}
              onOpenChange={() => {}}
              data={
                unverifiedTokens.length > 0 ? unverifiedTokens[0] : undefined
              }
              onDecline={(token, context) => {
                const tokens = unverifiedTokens.filter(
                  (unverifiedToken) =>
                    !(
                      unverifiedToken.context === context &&
                      unverifiedToken.token.address === token?.address &&
                      unverifiedToken.token.chainId === token?.chainId
                    )
                )
                setUnverifiedTokens(tokens)
              }}
              onAcceptToken={(token, context) => {
                if (token) {
                  if (context === 'to') {
                    onAnalyticEvent?.(EventNames.SWAP_TOKEN_SELECT, {
                      direction: 'output',
                      token_symbol: token.symbol
                    })
                    if (
                      token.address === fromToken?.address &&
                      token.chainId === fromToken?.chainId &&
                      address === recipient &&
                      (!lockToToken || !fromToken)
                    ) {
                      handleSetToToken(fromToken)
                      handleSetFromToken(toToken)
                    } else {
                      handleSetToToken(token)
                    }
                  } else if (context === 'from') {
                    onAnalyticEvent?.(EventNames.SWAP_TOKEN_SELECT, {
                      direction: 'input',
                      token_symbol: token.symbol
                    })
                    if (
                      token.address === toToken?.address &&
                      token.chainId === toToken?.chainId &&
                      address === recipient &&
                      (!lockToToken || !fromToken)
                    ) {
                      handleSetFromToken(toToken)
                      handleSetToToken(fromToken)
                    } else {
                      handleSetFromToken(token)
                    }
                  }
                }
                const tokens = unverifiedTokens.filter(
                  (unverifiedToken) =>
                    !(
                      unverifiedToken.token.address === token?.address &&
                      unverifiedToken.token.chainId === token?.chainId
                    )
                )
                setUnverifiedTokens(tokens)
              }}
            />
          </>
        )
      }}
    </TokenWidgetRenderer>
  )
}

export default TokenWidget
