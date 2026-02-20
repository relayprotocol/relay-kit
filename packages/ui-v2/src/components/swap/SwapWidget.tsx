import * as React from 'react'
import { useAccount } from 'wagmi'
import { cn } from '@/lib/utils.js'
import { useSwapWidget } from '@/hooks/useSwapWidget.js'
import type { UseSwapWidgetOptions } from '@/hooks/useSwapWidget.js'
import { useRelayClient } from '@/hooks/useRelayClient.js'
import { TokenPanel } from './TokenPanel.js'
import { SwapArrow } from './SwapArrow.js'
import { FeeBreakdown } from './FeeBreakdown.js'
import { SwapButton } from './SwapButton.js'
import { SlippageConfig } from './SlippageConfig.js'
import { TokenSelector } from './TokenSelector.js'
import { RecipientSelector } from './RecipientSelector.js'
import { OriginWalletSelector } from './OriginWalletSelector.js'
import { TransactionModal } from '@/components/transaction/TransactionModal.js'
import { formatDollar } from '@/lib/format.js'
import { formatUnits } from 'viem'
import type { ChainVM } from '@relayprotocol/relay-sdk'

export type SwapWidgetProps = UseSwapWidgetOptions & {
  /** Additional className on the widget wrapper */
  className?: string
  /** Override the widget title. Default: 'Swap' */
  title?: string
}

/**
 * Drop-in swap widget component for @relayprotocol/relay-kit-ui-v2.
 *
 * Wrap your app with <RelayKitProvider> and then use this component directly:
 * ```tsx
 * <SwapWidget supportedWalletVMs={['evm']} />
 * ```
 *
 * Layout:
 *   [Title]
 *   ┌────────────────────────────┐
 *   │   Sell panel               │
 *   │   [Origin wallet inside]   │
 *   └────────────────────────────┘
 *              [↕ arrow]
 *   ┌────────────────────────────┐
 *   │   Buy panel                │
 *   │   [Recipient inside]       │
 *   └────────────────────────────┘
 *   [Max Slippage card]
 *   [Fee breakdown]
 *   [CTA button]
 */
export const SwapWidget: React.FC<SwapWidgetProps> = ({
  className,
  title = 'Swap',
  ...swapOptions
}) => {
  const { address } = useAccount()
  const relayClient = useRelayClient()
  const [fromSelectorOpen, setFromSelectorOpen] = React.useState(false)
  const [toSelectorOpen, setToSelectorOpen] = React.useState(false)

  // ── Origin address override (multi-wallet from-side) ───────────────────────
  const [originAddressOverride, setOriginAddressOverride] = React.useState<string | undefined>(undefined)

  // ── USD input mode state (from side) ────────────────────────────────────────
  const [isUsdInputMode, setIsUsdInputMode] = React.useState(false)
  const [usdInputValue, setUsdInputValue] = React.useState('')
  const [tokenInputCache, setTokenInputCache] = React.useState('')

  // ── USD output mode state (to side) ─────────────────────────────────────────
  const [isUsdOutputMode, setIsUsdOutputMode] = React.useState(false)
  const [usdOutputInputValue, setUsdOutputInputValue] = React.useState('')

  const swapState = useSwapWidget({
    ...swapOptions,
    context: swapOptions.context ?? 'Swap',
    originAddressOverride
  })

  const {
    fromToken, setFromToken,
    toToken, setToToken,
    amountInputValue, setAmountInputValue,
    amountOutputValue, setAmountOutputValue,
    debouncedInputAmountValue,
    debouncedOutputAmountValue,
    setTradeType,
    quote, isFetchingQuote,
    feeBreakdown, timeEstimate,
    fromBalance, fromBalancePending, isLoadingFromBalance,
    toBalance, toBalancePending, isLoadingToBalance,
    fromTokenPriceData, toTokenPriceData,
    hasInsufficientBalance,
    ctaCopy,
    swap,
    transactionModalOpen, setTransactionModalOpen,
    steps, swapError, setSwapError, setSteps,
    slippageTolerance, setSlippageTolerance,
    recipient,
    setCustomToAddress,
    address: swapAddress
  } = swapState

  // Resolve the to-chain for recipient wallet filtering
  const toChain = React.useMemo(() => {
    if (!toToken || !relayClient?.chains) return undefined
    return relayClient.chains.find((c) => c.id === toToken.chainId)
  }, [relayClient, toToken])

  const fromChain = React.useMemo(() => {
    if (!fromToken || !relayClient?.chains) return undefined
    return relayClient.chains.find((c) => c.id === fromToken.chainId)
  }, [relayClient, fromToken])

  const multiWalletSupportEnabled = !!(swapOptions as { multiWalletSupportEnabled?: boolean }).multiWalletSupportEnabled
  const onAnalyticEvent = swapOptions.onAnalyticEvent

  // ── USD mode: conversion rates ──────────────────────────────────────────────
  // useTokenPrice returns { data: { price?: number } } — field is `price`, not `usd`
  const fromUsdRate = React.useMemo(() => {
    const price = fromTokenPriceData as { price?: number } | undefined
    return price?.price ?? null
  }, [fromTokenPriceData])

  const toUsdRate = React.useMemo(() => {
    const price = toTokenPriceData as { price?: number } | undefined
    return price?.price ?? null
  }, [toTokenPriceData])

  // ── USD input mode: sync token amount when usdInputValue changes ────────────
  React.useEffect(() => {
    if (!isUsdInputMode || !usdInputValue) return
    const rate = fromUsdRate
    if (!rate) return
    const usdNum = parseFloat(usdInputValue)
    if (isNaN(usdNum)) return
    const tokenEquiv = usdNum / rate
    setAmountInputValue(tokenEquiv > 0 ? tokenEquiv.toFixed(6) : '')
    setTradeType('EXACT_INPUT')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdInputValue, fromUsdRate, isUsdInputMode])

  // ── USD output mode: sync token output when usdOutputInputValue changes ─────
  React.useEffect(() => {
    if (!isUsdOutputMode || !usdOutputInputValue) return
    const rate = toUsdRate
    if (!rate) return
    const usdNum = parseFloat(usdOutputInputValue)
    if (isNaN(usdNum)) return
    const tokenEquiv = usdNum / rate
    setAmountOutputValue(tokenEquiv > 0 ? tokenEquiv.toFixed(6) : '')
    setTradeType('EXPECTED_OUTPUT')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdOutputInputValue, toUsdRate, isUsdOutputMode])

  // ── USD input toggle ─────────────────────────────────────────────────────────
  const handleToggleUsdInputMode = React.useCallback(() => {
    if (isUsdInputMode) {
      setIsUsdInputMode(false)
      if (tokenInputCache) setAmountInputValue(tokenInputCache)
      setUsdInputValue('')
    } else {
      setTokenInputCache(amountInputValue)
      setIsUsdInputMode(true)
      if (amountInputValue && fromUsdRate) {
        const usd = parseFloat(amountInputValue) * fromUsdRate
        setUsdInputValue(isNaN(usd) ? '' : usd.toFixed(2))
      } else {
        setUsdInputValue('')
      }
    }
  }, [isUsdInputMode, amountInputValue, fromUsdRate, tokenInputCache, setAmountInputValue])

  // ── USD output toggle ────────────────────────────────────────────────────────
  const handleToggleUsdOutputMode = React.useCallback(() => {
    if (isUsdOutputMode) {
      setIsUsdOutputMode(false)
      setUsdOutputInputValue('')
    } else {
      setIsUsdOutputMode(true)
      if (amountOutputValue && toUsdRate) {
        const usd = parseFloat(amountOutputValue) * toUsdRate
        setUsdOutputInputValue(isNaN(usd) ? '' : usd.toFixed(2))
      } else {
        setUsdOutputInputValue('')
      }
    }
  }, [isUsdOutputMode, amountOutputValue, toUsdRate])

  // ── Computed values ──────────────────────────────────────────────────────────

  const fromAmountUsd = React.useMemo(() => {
    if (isUsdInputMode) return usdInputValue ? `$${parseFloat(usdInputValue).toFixed(2)}` : undefined
    if (!fromTokenPriceData || !amountInputValue) return undefined
    const price = fromTokenPriceData as { price?: number }
    if (!price?.price) return undefined
    const usd = parseFloat(amountInputValue) * price.price
    return formatDollar(usd)
  }, [fromTokenPriceData, amountInputValue, isUsdInputMode, usdInputValue])

  const toAmountUsd = React.useMemo(() => {
    if (isUsdOutputMode) return usdOutputInputValue ? `$${parseFloat(usdOutputInputValue).toFixed(2)}` : undefined
    if (quote?.details?.currencyOut?.amountUsd) {
      return formatDollar(parseFloat(quote.details.currencyOut.amountUsd))
    }
    return undefined
  }, [quote, isUsdOutputMode, usdOutputInputValue])

  const rateDisplay = React.useMemo(() => {
    if (!fromToken || !toToken || !quote?.details) return undefined
    const inAmount = quote.details.currencyIn?.amountFormatted
    const outAmount = quote.details.currencyOut?.amountFormatted
    if (!inAmount || !outAmount) return undefined
    return `1 ${fromToken.symbol} ≈ ${(parseFloat(outAmount) / parseFloat(inAmount)).toFixed(4)} ${toToken.symbol}`
  }, [quote, fromToken, toToken])

  // USD toggle display values (from side)
  const fromUsdToggleDisplay = React.useMemo(() => {
    if (isUsdInputMode) {
      return amountInputValue ? `${parseFloat(amountInputValue).toFixed(6)} ${fromToken?.symbol ?? ''}` : '—'
    }
    return fromAmountUsd ?? '—'
  }, [isUsdInputMode, amountInputValue, fromToken, fromAmountUsd])

  // USD toggle display values (to side)
  const toUsdToggleDisplay = React.useMemo(() => {
    if (isUsdOutputMode) {
      return amountOutputValue ? `${parseFloat(amountOutputValue).toFixed(6)} ${toToken?.symbol ?? ''}` : '—'
    }
    return toAmountUsd ?? '—'
  }, [isUsdOutputMode, amountOutputValue, toToken, toAmountUsd])

  // Origin gas USD for fee breakdown
  const originGasUsd = React.useMemo(() => {
    return feeBreakdown?.breakdown?.find((f) => f.id === 'origin-gas')?.usd.formatted
  }, [feeBreakdown])

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleSwapArrow = () => {
    const tempFrom = fromToken
    const tempTo = toToken
    setFromToken(tempTo)
    setToToken(tempFrom)
    setAmountInputValue('')
    setAmountOutputValue('')
    setTradeType('EXACT_INPUT')
    // Exit USD modes on direction change
    setIsUsdInputMode(false)
    setIsUsdOutputMode(false)
    setUsdInputValue('')
    setUsdOutputInputValue('')
    setTokenInputCache('')
  }

  const handleMaxClick = () => {
    if (fromBalance !== undefined && fromToken) {
      const maxAmount = formatUnits(fromBalance, fromToken.decimals)
      setAmountInputValue(maxAmount)
      setTradeType('EXACT_INPUT')
      // Exit USD mode when max is clicked
      if (isUsdInputMode) {
        setIsUsdInputMode(false)
        setUsdInputValue('')
      }
    }
  }

  const handleConfirm = async () => {
    await swap()
  }

  const handleModalClose = () => {
    setTransactionModalOpen(false)
    if (swapError) {
      setSwapError(null)
      setSteps(null)
    }
  }

  // ── Derived button state ─────────────────────────────────────────────────────
  const isNotConnected = !address && !swapAddress
  const hasTypedAmount = !!(amountInputValue || amountOutputValue || debouncedInputAmountValue || debouncedOutputAmountValue)
  const isButtonDisabled =
    !fromToken ||
    !toToken ||
    !swapState.fromChainWalletVMSupported ||
    hasInsufficientBalance ||
    swapState.isSameCurrencySameRecipientSwap ||
    swapState.isInsufficientLiquidityError ||
    // Disable if no quote and not currently fetching (but only after user has entered an amount)
    (hasTypedAmount && !quote && !isFetchingQuote)

  // Amount handlers
  const fromPanelAmount = isUsdInputMode ? usdInputValue : amountInputValue
  const toPanelAmount = isUsdOutputMode ? usdOutputInputValue : amountOutputValue

  const handleFromAmountChange = (val: string) => {
    if (isUsdInputMode) {
      setUsdInputValue(val)
      // Effect will convert to token amount and set tradeType
    } else {
      setAmountInputValue(val)
      setTradeType('EXACT_INPUT')
    }
  }

  const handleToAmountChange = (val: string) => {
    if (isUsdOutputMode) {
      setUsdOutputInputValue(val)
      // Effect will convert to token amount and set tradeType
    } else {
      setAmountOutputValue(val)
      setTradeType('EXPECTED_OUTPUT')
    }
  }

  // ── Wallet slots ─────────────────────────────────────────────────────────────
  const fromWalletSlot = multiWalletSupportEnabled ? (
    <OriginWalletSelector
      fromChainVmType={fromChain?.vmType as ChainVM | undefined}
      linkedWallets={swapOptions.linkedWallets}
      selectedAddress={originAddressOverride}
      fromAddress={swapAddress}
      onSelect={setOriginAddressOverride}
      onConnectWallet={swapOptions.onConnectWallet}
    />
  ) : undefined

  const toWalletSlot = multiWalletSupportEnabled ? (
    <RecipientSelector
      recipient={recipient}
      linkedWallets={swapOptions.linkedWallets}
      toChain={toChain}
      fromAddress={swapAddress}
      onSelectRecipient={setCustomToAddress}
      onConnectWallet={swapOptions.onConnectWallet}
    />
  ) : undefined

  return (
    <div
      className={cn('w-full max-w-[440px] flex flex-col gap-1.5', className)}
      aria-label="Relay Swap Widget"
    >
      {/* a11y: hidden live region */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* Header: title + compact slippage gear */}
      <div className="px-1 mb-0.5 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <SlippageConfig
          value={slippageTolerance}
          onChange={setSlippageTolerance}
          compact
          onAnalyticEvent={onAnalyticEvent}
        />
      </div>

      {/* From token panel */}
      <TokenPanel
        side="from"
        label="Sell"
        token={fromToken}
        onSelectToken={() => setFromSelectorOpen(true)}
        amount={fromPanelAmount}
        onAmountChange={handleFromAmountChange}
        amountUsd={fromAmountUsd}
        balance={fromBalance}
        hasPendingBalance={fromBalancePending}
        isLoadingBalance={isLoadingFromBalance}
        onMaxClick={handleMaxClick}
        isUsdMode={isUsdInputMode}
        onToggleUsdMode={fromToken ? handleToggleUsdInputMode : undefined}
        usdToggleDisplay={fromToken ? fromUsdToggleDisplay : undefined}
        isLoadingToggleValue={isFetchingQuote}
        isOverBalance={hasInsufficientBalance}
        walletSlot={fromWalletSlot}
        onAnalyticEvent={onAnalyticEvent}
      />

      {/* Swap direction arrow — overlaps both panels with negative margin */}
      <div className="flex justify-center -my-3 z-10 relative">
        <SwapArrow onClick={handleSwapArrow} />
      </div>

      {/* To token panel */}
      <TokenPanel
        side="to"
        label="Buy"
        token={toToken}
        onSelectToken={() => setToSelectorOpen(true)}
        amount={toPanelAmount}
        onAmountChange={handleToAmountChange}
        amountUsd={toAmountUsd}
        showAmountUsd
        balance={toBalance}
        hasPendingBalance={toBalancePending}
        isLoadingBalance={isLoadingToBalance}
        isLoadingQuote={isFetchingQuote && !!debouncedInputAmountValue}
        isUsdMode={isUsdOutputMode}
        onToggleUsdMode={toToken ? handleToggleUsdOutputMode : undefined}
        usdToggleDisplay={toToken ? toUsdToggleDisplay : undefined}
        isLoadingToggleValue={isFetchingQuote}
        walletSlot={toWalletSlot}
        onAnalyticEvent={onAnalyticEvent}
      />

      {/* Fee breakdown */}
      <FeeBreakdown
        feeBreakdown={feeBreakdown}
        isFetchingQuote={isFetchingQuote && !!(amountInputValue || debouncedInputAmountValue) && !!fromToken && !!toToken}
        rateDisplay={rateDisplay}
        timeEstimate={timeEstimate}
        slippageTolerance={slippageTolerance}
        isAutoSlippage={!slippageTolerance}
        originGasUsd={originGasUsd}
        quote={quote}
      />

      {/* Main CTA button */}
      <SwapButton
        ctaCopy={ctaCopy}
        onClick={handleConfirm}
        isDisabled={isButtonDisabled}
        isNotConnected={isNotConnected}
        onConnectWallet={swapOptions.onConnectWallet}
        isFetchingQuote={isFetchingQuote}
        onAnalyticEvent={onAnalyticEvent}
      />

      {/* Token selectors */}
      <TokenSelector
        open={fromSelectorOpen}
        onClose={() => setFromSelectorOpen(false)}
        side="from"
        onSelectToken={setFromToken}
        selectedToken={fromToken}
        address={swapAddress}
        onAnalyticEvent={onAnalyticEvent}
      />
      <TokenSelector
        open={toSelectorOpen}
        onClose={() => setToSelectorOpen(false)}
        side="to"
        onSelectToken={setToToken}
        selectedToken={toToken}
        address={swapAddress}
        onAnalyticEvent={onAnalyticEvent}
      />

      {/* Transaction confirmation/progress modal */}
      <TransactionModal
        open={transactionModalOpen}
        onClose={handleModalClose}
        fromToken={fromToken}
        toToken={toToken}
        amountInputValue={amountInputValue}
        amountOutputValue={amountOutputValue}
        feeBreakdown={feeBreakdown}
        timeEstimate={timeEstimate}
        steps={steps}
        swapError={swapError}
        onConfirm={handleConfirm}
        onAnalyticEvent={onAnalyticEvent}
      />
    </div>
  )
}
