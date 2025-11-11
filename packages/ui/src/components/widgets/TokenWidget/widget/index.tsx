import { Flex, Button, Text } from '../../../primitives/index.js'
import { TabsRoot, TabsList, TabsTrigger } from '../../../primitives/Tabs.js'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC
} from 'react'
import { useRelayClient } from '../../../../hooks/index.js'
import type { Address } from 'viem'
import { formatUnits } from 'viem'
import { usePublicClient } from 'wagmi'
import type { LinkedWallet, Token } from '../../../../types/index.js'
import {
  ASSETS_RELAY_API,
  type ChainVM,
  type Execute,
  type RelayChain
} from '@relayprotocol/relay-sdk'
import { EventNames } from '../../../../constants/events.js'
import WidgetContainer from '../../WidgetContainer.js'
import type { AdaptedWallet } from '@relayprotocol/relay-sdk'
import { ProviderOptionsContext } from '../../../../providers/RelayKitProvider.js'
import { findBridgableToken } from '../../../../utils/tokens.js'
import { UnverifiedTokenModal } from '../../../common/UnverifiedTokenModal.js'
import { alreadyAcceptedToken } from '../../../../utils/localStorage.js'
import { calculateUsdValue, getSwapEventData } from '../../../../utils/quote.js'
import { getFeeBufferAmount } from '../../../../utils/nativeMaxAmount.js'
import TokenWidgetRenderer, { type TradeType } from './TokenWidgetRenderer.js'
import BuyTabContent from '../BuyTabContent.js'
import SellTabContent from '../SellTabContent.js'
import { useQuote } from '@relayprotocol/relay-kit-hooks'
import { useWalletGuards } from '../hooks/useWalletGuards.js'

type BaseTokenWidgetProps = {
  fromToken?: Token
  setFromToken?: (token?: Token) => void
  toToken?: Token
  setToToken?: (token?: Token) => void
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
  useSecureBaseUrl?: (parameters: Parameters<typeof useQuote>['2']) => boolean
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
  fromToken: externalFromToken,
  setFromToken: setExternalFromToken,
  toToken: externalToToken,
  setToToken: setExternalToToken,
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
  useSecureBaseUrl,
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
  const declinedTokensRef = useRef<Set<string>>(new Set())

  const [fromToken, setFromToken] = useState<Token | undefined>(
    externalFromToken
  )
  const [toToken, setToToken] = useState<Token | undefined>(externalToToken)

  useEffect(() => {
    setFromToken(externalFromToken)
  }, [externalFromToken])

  useEffect(() => {
    setToToken(externalToToken)
  }, [externalToToken])

  const updateFromToken = useCallback(
    (token: Token | undefined) => {
      setFromToken(token)
      setExternalFromToken?.(token)
    },
    [setExternalFromToken]
  )

  const updateToToken = useCallback(
    (token: Token | undefined) => {
      setToToken(token)
      setExternalToToken?.(token)
    },
    [setExternalToToken]
  )

  const [isUsdInputMode, setIsUsdInputMode] = useState(false)
  const [usdInputValue, setUsdInputValue] = useState('')
  const [usdOutputValue, setUsdOutputValue] = useState('')
  const [tokenInputCache, setTokenInputCache] = useState('')
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const tabTokenStateRef = useRef<{
    buy: { fromToken?: Token; toToken?: Token }
    sell: { fromToken?: Token; toToken?: Token }
  }>({ buy: {}, sell: {} })
  const tabRecipientRef = useRef<{
    buy: { override?: string; custom?: string }
    sell: { override?: string; custom?: string }
  }>({ buy: {}, sell: {} })
  const setTradeTypeRef = useRef<((tradeType: TradeType) => void) | null>(null)
  const tradeTypeRef = useRef<TradeType>(defaultTradeType ?? 'EXPECTED_OUTPUT')

  const hasLockedToken = lockFromToken || lockToToken
  const isSingleChainLocked = singleChainMode && lockChainId !== undefined
  const [localSlippageTolerance, setLocalSlippageTolerance] = useState<
    string | undefined
  >(slippageTolerance)

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

  //Handle unverified tokens
  useEffect(() => {
    const tokensToVerify: { token: Token; context: 'to' | 'from' }[] = []

    const getTokenKey = (token: Token) =>
      `${token.chainId}:${token.address.toLowerCase()}`

    if (fromToken && 'verified' in fromToken && !fromToken.verified) {
      if (alreadyAcceptedToken(fromToken)) {
        setFromToken({ ...fromToken, verified: true })
      } else if (!declinedTokensRef.current.has(getTokenKey(fromToken))) {
        tokensToVerify.push({ token: fromToken, context: 'from' })
      }
    }

    if (toToken && 'verified' in toToken && !toToken.verified) {
      if (alreadyAcceptedToken(toToken)) {
        setToToken({ ...toToken, verified: true })
      } else if (!declinedTokensRef.current.has(getTokenKey(toToken))) {
        tokensToVerify.push({ token: toToken, context: 'to' })
      }
    }

    if (tokensToVerify.length > 0) {
      setUnverifiedTokens((prev) => [...prev, ...tokensToVerify])

      tokensToVerify.forEach(({ context }) => {
        if (context === 'from') {
          setFromToken(undefined)
        } else {
          setToToken(undefined)
        }
      })
    }
  }, [fromToken, toToken])

  return (
    <TokenWidgetRenderer
      context="Swap"
      transactionModalOpen={transactionModalOpen}
      setTransactionModalOpen={setTransactionModalOpen}
      depositAddressModalOpen={depositAddressModalOpen}
      defaultAmount={defaultAmount}
      defaultToAddress={defaultToAddress}
      defaultTradeType={computedDefaultTradeType}
      toToken={toToken}
      setToToken={updateToToken}
      fromToken={fromToken}
      setFromToken={updateFromToken}
      slippageTolerance={localSlippageTolerance}
      wallet={wallet}
      linkedWallets={linkedWallets}
      multiWalletSupportEnabled={multiWalletSupportEnabled}
      onSwapError={onSwapError}
      onAnalyticEvent={onAnalyticEvent}
      supportedWalletVMs={supportedWalletVMs}
      useSecureBaseUrl={useSecureBaseUrl}
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
        originAddressOverride: _originAddressOverride,
        setOriginAddressOverride,
        recipient,
        customToAddress,
        setCustomToAddress,
        destinationAddressOverride,
        setDestinationAddressOverride,
        tradeType,
        setTradeType,
        isSameCurrencySameRecipientSwap,
        allowUnsupportedOrigin,
        setAllowUnsupportedOrigin,
        allowUnsupportedRecipient,
        setAllowUnsupportedRecipient,
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

        useEffect(() => {
          tabTokenStateRef.current[activeTab] = {
            fromToken,
            toToken
          }
        }, [activeTab, fromToken, toToken])

        useEffect(() => {
          tabRecipientRef.current[activeTab] = {
            override:
              typeof destinationAddressOverride === 'string'
                ? destinationAddressOverride
                : undefined,
            custom:
              typeof customToAddress === 'string' ? customToAddress : undefined
          }
        }, [activeTab, destinationAddressOverride, customToAddress])

        useEffect(() => {
          setAllowUnsupportedOrigin(activeTab === 'buy')
          setAllowUnsupportedRecipient(activeTab === 'sell')
        }, [activeTab, setAllowUnsupportedOrigin, setAllowUnsupportedRecipient])

        // Auto-select first compatible wallet in buy tab when toToken is set and no destination is selected
        useEffect(() => {
          if (
            activeTab === 'buy' &&
            toToken &&
            multiWalletSupportEnabled &&
            linkedWallets &&
            linkedWallets.length > 0 &&
            !destinationAddressOverride &&
            !customToAddress
          ) {
            // Find the destination chain for filtering compatible wallets
            const toChain = relayClient?.chains?.find(
              (c) => c.id === toToken.chainId
            )

            if (toChain) {
              // Filter wallets compatible with the destination chain VM type
              const compatibleWallets = linkedWallets.filter((wallet) => {
                return wallet.vmType === toChain.vmType
              })

              // Auto-select the first compatible wallet (prefer the current address if compatible)
              const currentAddressWallet = compatibleWallets.find(
                (w) => w.address.toLowerCase() === address?.toLowerCase()
              )
              const walletToSelect =
                currentAddressWallet || compatibleWallets[0]

              if (walletToSelect) {
                setDestinationAddressOverride(walletToSelect.address)
              }
            }
          }
        }, [
          activeTab,
          toToken,
          multiWalletSupportEnabled,
          linkedWallets,
          destinationAddressOverride,
          customToAddress,
          relayClient?.chains,
          setDestinationAddressOverride,
          address
        ])

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

        const handleSetToToken = useCallback(
          (token?: Token) => {
            if (!token) {
              updateToToken(undefined)
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
            updateToToken(_token)
            onToTokenChange?.(_token)
          },
          [
            fromChainWalletVMSupported,
            onToTokenChange,
            relayClient,
            updateToToken
          ]
        )

        const handleSetFromToken = useCallback(
          (token?: Token) => {
            if (!token) {
              updateFromToken(undefined)
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

            updateFromToken(_token)
            onFromTokenChange?.(_token)
          },
          [
            handleSetToToken,
            onFromTokenChange,
            relayClient,
            updateFromToken,
            setTradeType,
            supportedWalletVMs,
            toChain,
            toToken
          ]
        )

        // Get public client for the fromChain to estimate gas
        const publicClient = usePublicClient({ chainId: fromChain?.id })

        useWalletGuards({
          multiWalletSupportEnabled,
          allowUnsupportedOrigin,
          allowUnsupportedRecipient,
          fromChain,
          toChain,
          address,
          recipient,
          linkedWallets,
          connectorKeyOverrides,
          onSetPrimaryWallet,
          isValidFromAddress,
          isValidToAddress,
          setOriginAddressOverride,
          setCustomToAddress,
          disablePasteWalletAddressOption,
          customToAddress: customToAddress as string | undefined,
          originAddressOverride: _originAddressOverride as string | undefined,
          destinationAddressOverride: destinationAddressOverride as
            | string
            | undefined,
          setDestinationAddressOverride
        })

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
                      setDestinationAddressOverride(wallet.address)
                      setCustomToAddress(undefined)
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
                    if (!wallet) {
                      return
                    }
                    setDestinationAddressOverride(wallet.address)
                    setCustomToAddress(undefined)
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

        useEffect(() => {
          if (
            activeTab === 'buy' &&
            !address &&
            !linkedWallets?.length &&
            !fromToken &&
            relayClient
          ) {
            const baseUSDC: Token = {
              chainId: 8453,
              address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
              name: 'USD Coin',
              symbol: 'USDC',
              decimals: 6,
              logoURI: `${ASSETS_RELAY_API}/icons/currencies/usdc.png`,
              verified: true
            }

            handleSetFromToken(baseUSDC)
          }
        }, [
          activeTab,
          address,
          linkedWallets?.length,
          fromToken,
          relayClient,
          handleSetFromToken
        ])

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

                        setAllowUnsupportedOrigin(nextTab === 'buy')
                        setAllowUnsupportedRecipient(nextTab === 'sell')

                        if (nextTab !== activeTab) {
                          tabTokenStateRef.current[activeTab] = {
                            fromToken,
                            toToken
                          }
                          tabRecipientRef.current[activeTab] = {
                            override:
                              typeof destinationAddressOverride === 'string'
                                ? destinationAddressOverride
                                : undefined,
                            custom:
                              typeof customToAddress === 'string'
                                ? customToAddress
                                : undefined
                          }

                          const currentState =
                            tabTokenStateRef.current[activeTab] ?? {}
                          const storedNextState =
                            tabTokenStateRef.current[nextTab] ?? {}
                          const storedNextRecipient =
                            tabRecipientRef.current[nextTab] ?? {}

                          let nextFromToken: Token | undefined =
                            storedNextState.fromToken
                          let nextToToken: Token | undefined =
                            storedNextState.toToken

                          if (nextTab === 'sell') {
                            const sellToken =
                              nextFromToken ??
                              currentState.toToken ??
                              toToken ??
                              fromToken
                            const receiveToken =
                              nextToToken ?? currentState.fromToken ?? fromToken

                            nextFromToken = sellToken ?? undefined
                            nextToToken = receiveToken ?? undefined
                          } else {
                            const buyToken =
                              nextToToken ??
                              currentState.toToken ??
                              toToken ??
                              fromToken
                            const payToken =
                              nextFromToken ??
                              currentState.fromToken ??
                              fromToken ??
                              currentState.toToken

                            nextFromToken = payToken ?? undefined
                            nextToToken = buyToken ?? undefined
                          }

                          tabTokenStateRef.current[nextTab] = {
                            fromToken: nextFromToken,
                            toToken: nextToToken
                          }
                          tabRecipientRef.current[nextTab] = storedNextRecipient

                          handleSetFromToken(nextFromToken)
                          handleSetToToken(nextToToken)
                          setDestinationAddressOverride(
                            storedNextRecipient.override
                          )
                          setCustomToAddress(storedNextRecipient.custom)

                          // Auto-select first compatible wallet in buy tab if no destination is set
                          if (
                            nextTab === 'buy' &&
                            multiWalletSupportEnabled &&
                            linkedWallets &&
                            linkedWallets.length > 0 &&
                            !storedNextRecipient.override &&
                            !storedNextRecipient.custom
                          ) {
                            // Find the destination chain for filtering compatible wallets
                            const toChain = relayClient?.chains?.find(
                              (c) => c.id === nextToToken?.chainId
                            )

                            if (toChain) {
                              // Filter wallets compatible with the destination chain VM type
                              const compatibleWallets = linkedWallets.filter(
                                (wallet) => {
                                  return wallet.vmType === toChain.vmType
                                }
                              )

                              // Auto-select the first compatible wallet
                              if (compatibleWallets.length > 0) {
                                setDestinationAddressOverride(
                                  compatibleWallets[0].address
                                )
                              }
                            }
                          }

                          setAmountInputValue('')
                          setAmountOutputValue('')
                          setUsdInputValue('')
                          setUsdOutputValue('')
                          setTokenInputCache('')
                          setIsUsdInputMode(false)
                          debouncedAmountInputControls.cancel()
                          debouncedAmountOutputControls.cancel()
                          setOriginAddressOverride(undefined)
                        }

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
                        <TabsList
                          css={{
                            backgroundColor: 'transparent',
                            p: '0',
                            mb: '2'
                          }}
                        >
                          <TabsTrigger
                            value="buy"
                            css={{
                              padding: '12px',
                              background: 'none',
                              border: '1px solid transparent',
                              color: 'gray11',
                              '&[data-state="active"]': {
                                background: 'white',
                                borderRadius: '12px',
                                borderColor: 'slate.4',
                                color: 'gray12'
                              },
                              '&:not([data-state="active"])': {
                                _hover: {
                                  backgroundColor: 'transparent !important'
                                }
                              },
                              _dark: {
                                '&[data-state="active"]': {
                                  background: 'gray1',
                                  borderColor: 'gray.4'
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
                              border: '1px solid transparent',
                              color: 'gray11',
                              '&[data-state="active"]': {
                                background: 'white',
                                borderRadius: '12px',
                                borderColor: 'slate.4',
                                color: 'gray12'
                              },
                              '&:not([data-state="active"])': {
                                _hover: {
                                  backgroundColor: 'transparent !important'
                                }
                              },
                              _dark: {
                                '&[data-state="active"]': {
                                  background: 'gray1',
                                  borderColor: 'gray.4'
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
                          {...{
                            // Slippage configuration
                            slippageTolerance: localSlippageTolerance,
                            onOpenSlippageConfig: handleOpenSlippageConfig,
                            onSlippageToleranceChange:
                              handleSlippageToleranceChange,

                            // Input/output state
                            isUsdInputMode,
                            usdOutputValue,
                            tradeType,
                            amountOutputValue,
                            amountInputValue,
                            outputAmountUsd,
                            setUsdOutputValue,
                            setTradeType,
                            setAmountOutputValue,
                            setAmountInputValue,
                            setUsdInputValue,
                            toggleInputMode,
                            debouncedAmountOutputControls,

                            // Tokens and pricing
                            toToken,
                            fromToken,
                            quote,
                            isFetchingQuote,
                            isLoadingToTokenPrice,
                            toTokenPriceData,
                            handleSetFromToken,
                            handleSetToToken,

                            // Balance information
                            feeBreakdown,
                            isLoadingFromBalance,
                            fromBalance,
                            fromBalancePending,
                            toBalance,
                            isLoadingToBalance,
                            toBalancePending,
                            hasInsufficientBalance,

                            // Wallet and address management
                            address,
                            multiWalletSupportEnabled,
                            linkedWallets,
                            onSetPrimaryWallet,
                            setOriginAddressOverride,
                            onConnectWallet,
                            onLinkNewWallet,
                            disablePasteWalletAddressOption,
                            setAddressModalOpen,

                            // Chain and VM support
                            fromChain,
                            toChain,
                            toChainWalletVMSupported,
                            fromChainWalletVMSupported,
                            supportedWalletVMs,

                            // Recipient configuration
                            recipient,
                            setCustomToAddress,
                            setDestinationAddressOverride,
                            isValidToAddress,
                            isRecipientLinked,
                            toDisplayName,
                            isValidFromAddress,
                            recipientWalletSupportsChain,
                            recipientLinkedWallet,

                            // Chain and token locking
                            lockToToken,
                            lockFromToken,
                            isSingleChainLocked,
                            lockChainId,
                            popularChainIds,

                            // Modal states
                            transactionModalOpen,
                            depositAddressModalOpen,

                            // Error and validation states
                            error,
                            isInsufficientLiquidityError,
                            isSameCurrencySameRecipientSwap,
                            isCapacityExceededError,
                            isCouldNotExecuteError,
                            supportsExternalLiquidity,

                            // UI state and interactions
                            showHighPriceImpactWarning,
                            disableSwapButton: promptSwitchRoute,
                            onPrimaryAction: handlePrimaryAction,
                            debouncedInputAmountValue,
                            debouncedOutputAmountValue,

                            // Fee and estimation
                            timeEstimate,
                            relayerFeeProportion,
                            highRelayerServiceFee,

                            // Event handling and misc
                            onAnalyticEvent,
                            toChainVmType: toChain?.vmType,
                            ctaCopy
                          }}
                        />

                        <SellTabContent
                          {...{
                            // Slippage configuration
                            slippageTolerance: localSlippageTolerance,
                            onOpenSlippageConfig: handleOpenSlippageConfig,
                            onSlippageToleranceChange:
                              handleSlippageToleranceChange,

                            // Input/output state
                            disableInputAutoFocus,
                            isUsdInputMode,
                            usdInputValue,
                            tradeType,
                            amountInputValue,
                            amountOutputValue,
                            conversionRate,
                            inputAmountUsd,
                            setUsdInputValue,
                            setTradeType,
                            setTokenInputCache,
                            setAmountInputValue,
                            setAmountOutputValue,
                            setUsdOutputValue,
                            toggleInputMode,
                            debouncedAmountInputControls,

                            // Tokens and pricing
                            fromToken,
                            toToken,
                            quote,
                            isFetchingQuote,
                            fromTokenPriceData,
                            isLoadingFromTokenPrice,
                            handleSetFromToken,
                            handleSetToToken,

                            // Balance information
                            feeBreakdown,
                            fromBalance,
                            isLoadingFromBalance,
                            toBalance,
                            isLoadingToBalance,
                            toBalancePending,
                            hasInsufficientBalance,
                            fromBalancePending,

                            // Wallet and address management
                            address,
                            multiWalletSupportEnabled,
                            linkedWallets,
                            onSetPrimaryWallet,
                            setOriginAddressOverride,
                            onConnectWallet,
                            onLinkNewWallet,
                            disablePasteWalletAddressOption,
                            setAddressModalOpen,

                            // Chain and VM support
                            fromChain,
                            toChain,
                            fromChainWalletVMSupported,
                            toChainWalletVMSupported,
                            supportedWalletVMs,

                            // Recipient configuration
                            recipient,
                            setCustomToAddress,
                            setDestinationAddressOverride,
                            isValidToAddress,
                            isRecipientLinked,
                            toDisplayName,
                            isValidFromAddress,
                            recipientWalletSupportsChain,
                            recipientLinkedWallet,

                            // Chain and token locking
                            lockToToken,
                            lockFromToken,
                            isSingleChainLocked,
                            lockChainId,
                            popularChainIds,

                            // Modal states
                            transactionModalOpen,
                            depositAddressModalOpen,

                            // Error and validation states
                            error,
                            isInsufficientLiquidityError,
                            isSameCurrencySameRecipientSwap,
                            isCapacityExceededError,
                            isCouldNotExecuteError,
                            supportsExternalLiquidity,

                            // UI state and interactions
                            showHighPriceImpactWarning,
                            disableSwapButton: promptSwitchRoute,
                            onPrimaryAction: handlePrimaryAction,
                            debouncedInputAmountValue,
                            debouncedOutputAmountValue,
                            percentOptions: percentageOptions,
                            onMaxAmountClicked: handleMaxAmountClicked,
                            publicClient,
                            isFromNative,
                            getFeeBufferAmount,

                            // Fee and estimation
                            timeEstimate,
                            relayerFeeProportion,
                            highRelayerServiceFee,

                            // Event handling and misc
                            onAnalyticEvent,
                            toChainVmType: toChain?.vmType,
                            ctaCopy
                          }}
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
                if (token) {
                  // Track declined tokens to prevent re-prompting
                  const tokenKey = `${token.chainId}:${token.address.toLowerCase()}`
                  declinedTokensRef.current.add(tokenKey)
                }
                setUnverifiedTokens((prev) =>
                  prev.filter(
                    (unverifiedToken) =>
                      !(
                        unverifiedToken.context === context &&
                        unverifiedToken.token.address === token?.address &&
                        unverifiedToken.token.chainId === token?.chainId
                      )
                  )
                )
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
                setUnverifiedTokens((prev) =>
                  prev.filter(
                    (unverifiedToken) =>
                      !(
                        unverifiedToken.token.address === token?.address &&
                        unverifiedToken.token.chainId === token?.chainId
                      )
                  )
                )
              }}
            />
          </>
        )
      }}
    </TokenWidgetRenderer>
  )
}

export default TokenWidget
