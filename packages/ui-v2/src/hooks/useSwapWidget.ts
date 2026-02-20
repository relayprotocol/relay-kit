import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import type { Address } from 'viem'
import { formatUnits, parseUnits, isAddress } from 'viem'
import { useAccount, useWalletClient } from 'wagmi'
import type { WalletClient } from 'viem'
import { adaptViemWallet } from '@relayprotocol/relay-sdk'
import type {
  AdaptedWallet,
  ChainVM,
  Execute,
  RelayClient
} from '@relayprotocol/relay-sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useQuote, useTokenPrice } from '@relayprotocol/relay-kit-hooks'

import { useRelayClient } from '@/hooks/useRelayClient.js'
import { useFallbackState } from '@/hooks/useFallbackState.js'
import { useDebounceState } from '@/hooks/useDebounceState.js'
import { useCurrencyBalance } from '@/hooks/useCurrencyBalance.js'
import { useWalletAddress } from '@/hooks/useWalletAddress.js'
import { useSwapButtonCta } from '@/hooks/useSwapButtonCta.js'
import { ProviderOptionsContext } from '@/providers/RelayKitProvider.js'
import { EventNames } from '@/constants/events.js'
import { isValidAddress, isWalletVmTypeCompatible } from '@/lib/address.js'
import type { Token, LinkedWallet } from '@/types/token.js'
import type { TradeType } from '@/types/swap.js'
import type { FeeBreakdown } from '@/types/fee.js'

/** Returns addresss with a placeholder for non-EVM wallets that don't have an address yet */
function addressWithFallback(
  vmType?: string,
  address?: string
): string | undefined {
  if (!address) return undefined
  if (vmType === 'evm' && !isAddress(address)) return undefined
  return address
}

/** Checks if a VM type is in the list of supported VMs */
function isChainVmTypeSupported(
  vmType?: ChainVM,
  supportedVMs?: Omit<ChainVM, 'hypevm' | 'lvm'>[]
): boolean {
  if (!vmType || !supportedVMs) return false
  return supportedVMs.includes(vmType as Omit<ChainVM, 'hypevm' | 'lvm'>)
}

/** Finds the first linked wallet that supports a given chain */
function findSupportedWallet(
  chain: { vmType?: ChainVM; id?: number },
  customAddress?: string,
  linkedWallets?: LinkedWallet[]
): string | undefined {
  if (!linkedWallets) return undefined
  const match = linkedWallets.find((w) => w.vmType === chain.vmType)
  return match?.address
}

// ─── Fee parsing (ported from packages/ui/src/utils/quote.ts) ────────────────

import { formatBN, formatDollar } from '@/lib/format.js'

function formatUsdFee(
  amountUsd: string | undefined,
  shouldFlipSign: boolean = false
): { value: number; formatted: string } {
  const value = Number(amountUsd ?? 0)
  const finalValue = shouldFlipSign ? -value : value
  return { value: finalValue, formatted: formatDollar(finalValue) }
}

function isGasSponsored(quote?: ReturnType<typeof useQuote>['data']): boolean {
  return (
    quote?.fees?.subsidized?.amount !== undefined &&
    quote?.fees?.subsidized?.amount !== '0'
  )
}

function parseFees(
  fromChain: { id: number; displayName: string },
  toChain: { id: number; displayName: string },
  quote?: ReturnType<typeof useQuote>['data']
): FeeBreakdown {
  const fees = quote?.fees
  const expandedPriceImpact = quote?.details?.expandedPriceImpact

  const gasFee = BigInt(fees?.gas?.amount ?? 0)
  const formattedGasFee = formatBN(
    gasFee,
    5,
    Number(fees?.gas?.currency?.decimals ?? 18)
  )

  const executionFeeUsd = expandedPriceImpact?.execution?.usd
  const relayFeeUsd = expandedPriceImpact?.relay?.usd
  const relayFeeIsReward = Number(relayFeeUsd ?? 0) > 0
  const appFeeUsd = expandedPriceImpact?.app?.usd
  const hasAppFee = appFeeUsd && Number(appFeeUsd) !== 0

  const totalFeesUsd =
    Number(fees?.relayer?.amountUsd ?? 0) + Number(fees?.app?.amountUsd ?? 0)
  const _isGasSponsored = isGasSponsored(quote)

  const breakdown = [
    {
      raw: gasFee,
      formatted: `${formattedGasFee}`,
      usd: formatUsdFee(fees?.gas?.amountUsd, true),
      name: `Deposit Gas (${fromChain.displayName})`,
      tooltip: null,
      type: 'gas' as const,
      id: 'origin-gas',
      currency: fees?.gas?.currency
    },
    {
      raw: 0n,
      formatted: '0',
      usd: _isGasSponsored ? { value: 0, formatted: '0' } : formatUsdFee(executionFeeUsd, false),
      name: `Execution Fee (${toChain.displayName})`,
      tooltip: null,
      type: 'gas' as const,
      id: 'destination-gas',
      currency: fees?.relayer?.currency
    },
    {
      raw: 0n,
      formatted: '0',
      usd: _isGasSponsored ? { value: 0, formatted: '0' } : formatUsdFee(relayFeeUsd, false),
      name: relayFeeIsReward ? 'Reward' : 'Relay Fee',
      tooltip: null,
      type: 'relayer' as const,
      id: 'relayer-fee',
      currency: fees?.relayer?.currency
    }
  ]

  if (hasAppFee) {
    breakdown.push({
      raw: 0n,
      formatted: '0',
      usd: _isGasSponsored ? { value: 0, formatted: '0' } : formatUsdFee(appFeeUsd, false),
      name: 'App Fee',
      tooltip: null,
      type: 'relayer' as const,
      id: 'app-fee',
      currency: fees?.app?.currency
    })
  }

  let priceImpactColor: FeeBreakdown['totalFees']['priceImpactColor'] = 'subtleSecondary'

  if (quote?.details?.totalImpact?.percent) {
    const percent = Number(quote.details.totalImpact.percent)
    if (percent <= -3) priceImpactColor = 'red'
    else if (percent > 0) priceImpactColor = 'success'
    else if (_isGasSponsored) priceImpactColor = 'success'
  }

  return {
    breakdown,
    totalFees: {
      usd: formatDollar(totalFeesUsd),
      priceImpactPercentage: quote?.details?.totalImpact?.percent
        ? `${quote.details.totalImpact.percent}%`
        : undefined,
      priceImpact:
        quote?.details?.totalImpact?.usd && quote.details.totalImpact.usd !== '0'
          ? formatDollar(parseFloat(quote.details.totalImpact.usd ?? '0'))
          : undefined,
      priceImpactColor,
      swapImpact: formatUsdFee(expandedPriceImpact?.swap?.usd, false)
    },
    isGasSponsored: _isGasSponsored
  }
}

function isHighRelayerServiceFee(quote?: ReturnType<typeof useQuote>['data']): boolean {
  const usdIn = quote?.details?.currencyIn?.amountUsd ? Number(quote.details.currencyIn.amountUsd) : null
  const relayerServiceFeeUsd = quote?.fees?.relayerService?.amountUsd ? Number(quote.fees.relayerService.amountUsd) : null
  if (!usdIn || !relayerServiceFeeUsd) return false
  const feeThresholdPercentage = (usdIn * 1.5) / 100
  const feeThresholdUsd = 25
  return relayerServiceFeeUsd > feeThresholdPercentage && relayerServiceFeeUsd > feeThresholdUsd
}

function calculateRelayerFeeProportion(quote?: ReturnType<typeof useQuote>['data']): bigint {
  const usdIn = quote?.details?.currencyIn?.amountUsd ? Number(quote.details.currencyIn.amountUsd) : null
  const relayerServiceFeeUsd = quote?.fees?.relayerService?.amountUsd ? Number(quote.fees.relayerService.amountUsd) : null
  if (!usdIn || !relayerServiceFeeUsd) return 0n
  return BigInt(Math.floor((relayerServiceFeeUsd * 100) / usdIn))
}

function calculateTimeEstimate(details?: NonNullable<ReturnType<typeof useQuote>['data']>['details']): { time: number; formattedTime: string } {
  const time = details?.timeEstimate ?? 0
  const formattedTime = time < 60 ? `~${time}s` : `~${Math.round(time / 60)}m`
  return { time, formattedTime }
}

function extractQuoteId(steps?: Execute['steps']): string | undefined {
  return steps?.[0]?.requestId
}

function getSwapEventData(
  details: Execute['details'],
  fees: Execute['fees'],
  steps: Execute['steps'] | null,
  connector?: string,
  quoteParameters?: unknown
) {
  return {
    wallet_connector: connector,
    amount_in: details?.currencyIn?.amount,
    amount_in_formatted: parseFloat(`${details?.currencyIn?.amountFormatted ?? '0'}`),
    currency_in: details?.currencyIn?.currency?.symbol,
    currency_in_address: details?.currencyIn?.currency?.address,
    chain_id_in: details?.currencyIn?.currency?.chainId,
    amount_out: details?.currencyOut?.amount,
    amount_out_formatted: parseFloat(`${details?.currencyOut?.amountFormatted ?? '0'}`),
    currency_out: details?.currencyOut?.currency?.symbol,
    currency_out_address: details?.currencyOut?.currency?.address,
    chain_id_out: details?.currencyOut?.currency?.chainId,
    currency_in_usd: details?.currencyIn?.amountUsd,
    currency_out_usd: details?.currencyOut?.amountUsd,
    quote_id: steps ? extractQuoteId(steps) : undefined,
    txHashes: steps?.flatMap((step) =>
      step.items?.flatMap((item) =>
        [...(item.txHashes ?? []), ...(item.internalTxHashes ?? [])]
      ) ?? []
    ),
    subsidized: fees?.subsidized !== undefined && fees.subsidized.amount !== '0' ? true : false
  }
}

// ─── Token price query options ────────────────────────────────────────────────

const TOKEN_PRICE_QUERY_OPTIONS = {
  staleTime: 60 * 1000, // 1 minute
  refetchInterval: 30 * 1000, // 30 seconds
  refetchOnWindowFocus: false
} as const

// ─── Types ────────────────────────────────────────────────────────────────────

export type UseSwapWidgetOptions = {
  /** Controlled from-token. If provided, setFromToken must also be provided. */
  fromToken?: Token
  setFromToken?: (token?: Token) => void
  /** Controlled to-token. If provided, setToToken must also be provided. */
  toToken?: Token
  setToToken?: (token?: Token) => void

  /** Default recipient address (e.g., for deposit flows) */
  defaultToAddress?: Address
  /** Default amount value to pre-populate the input */
  defaultAmount?: string
  /** Whether to start in EXACT_INPUT or EXPECTED_OUTPUT mode */
  defaultTradeType?: TradeType

  /** Slippage tolerance override (e.g., "0.5" for 0.5%) */
  slippageTolerance?: string

  /** AdaptedWallet instance for non-wagmi wallet integrations */
  wallet?: AdaptedWallet
  /** Additional wallets for multi-VM support (EVM + Solana, etc.) */
  linkedWallets?: LinkedWallet[]
  /** Whether multi-wallet support is enabled */
  multiWalletSupportEnabled?: boolean
  /** Which VM types the current wallet setup supports */
  supportedWalletVMs: Omit<ChainVM, 'hypevm' | 'lvm'>[]

  /** Context label used to customize analytics events */
  context?: 'Swap' | 'Deposit' | 'Withdraw'

  /** Called when the user clicks the connect wallet CTA */
  onConnectWallet?: () => void
  /** Analytics event callback — fires for every user interaction */
  onAnalyticEvent?: (eventName: string, data?: Record<string, unknown>) => void
  /** Called when a swap fails */
  onSwapError?: (error: string, data?: Execute) => void
  /** Called when a swap completes successfully */
  onSwapSuccess?: (data: Execute) => void

  /** Whether to use the secure base URL for quote requests */
  useSecureBaseUrl?: (parameters: Parameters<typeof useQuote>['2']) => boolean

  /** Override the "from" address (e.g. when user selects a different origin wallet) */
  originAddressOverride?: string
}

export type UseSwapWidgetReturn = {
  // ── Token state ─────────────────────────────────────────────────────────────
  /** Currently selected from-token */
  fromToken?: Token
  setFromToken: (token?: Token) => void
  /** Currently selected to-token */
  toToken?: Token
  setToToken: (token?: Token) => void

  // ── Amount state ─────────────────────────────────────────────────────────────
  /** Current raw value in the from-amount input (immediate, not debounced) */
  amountInputValue: string
  setAmountInputValue: (value: string) => void
  /** Debounced from-amount — used for quote requests */
  debouncedInputAmountValue: string
  /** Current raw value in the to-amount input (immediate, not debounced) */
  amountOutputValue: string
  setAmountOutputValue: (value: string) => void
  /** Debounced to-amount — used for quote requests */
  debouncedOutputAmountValue: string
  /** Whether input or output amount was specified by the user */
  tradeType: TradeType
  setTradeType: (type: TradeType) => void

  // ── Quote ────────────────────────────────────────────────────────────────────
  /** The latest quote response from the relay API */
  quote?: ReturnType<typeof useQuote>['data']
  /** True while a quote request is in-flight */
  isFetchingQuote: boolean
  /** Error from the last failed quote request */
  quoteError: Error | null
  /** Parsed fee breakdown for display in the fee summary UI */
  feeBreakdown: FeeBreakdown | null
  /** Estimated completion time for this swap */
  timeEstimate?: { time: number; formattedTime: string }
  /** Parameters used for the current quote request */
  quoteParameters?: Parameters<typeof useQuote>['2']

  // ── Balances ─────────────────────────────────────────────────────────────────
  /** Raw from-token balance in smallest unit */
  fromBalance?: bigint
  /** True if from-balance has a pending transaction that will increase it */
  fromBalancePending?: boolean
  /** True while from-balance is loading */
  isLoadingFromBalance: boolean
  /** Raw to-token balance in smallest unit */
  toBalance?: bigint
  /** True if to-balance has a pending transaction */
  toBalancePending?: boolean
  /** True while to-balance is loading */
  isLoadingToBalance: boolean

  // ── Token prices ─────────────────────────────────────────────────────────────
  /** Price data for the from-token */
  fromTokenPriceData: ReturnType<typeof useTokenPrice>['data']
  /** Price data for the to-token */
  toTokenPriceData: ReturnType<typeof useTokenPrice>['data']
  isLoadingFromTokenPrice: boolean
  isLoadingToTokenPrice: boolean

  // ── Validation ───────────────────────────────────────────────────────────────
  /** True if the user doesn't have enough from-token balance */
  hasInsufficientBalance: boolean
  /** True if the quote failed due to insufficient liquidity */
  isInsufficientLiquidityError: boolean
  /** True if the quote failed because the amount exceeds capacity */
  isCapacityExceededError: boolean
  /** True if the quote failed with "Could not execute" */
  isCouldNotExecuteError: boolean
  /** True if swapping to the same token/chain/address (invalid) */
  isSameCurrencySameRecipientSwap: boolean
  /** True if the from-address is valid for the from-chain VM */
  isValidFromAddress: boolean
  /** True if the to-address is valid for the to-chain VM */
  isValidToAddress: boolean

  // ── Multi-wallet ─────────────────────────────────────────────────────────────
  /** True if the from-token is the native gas token of its chain */
  isFromNative: boolean
  /** True if either chain is a Solana VM chain */
  isSvmSwap: boolean
  /** True if either chain is a Bitcoin VM chain */
  isBvmSwap: boolean
  /** True if the from-chain VM is in the supported wallet VMs list */
  fromChainWalletVMSupported: boolean
  /** True if the to-chain VM is in the supported wallet VMs list */
  toChainWalletVMSupported: boolean
  supportedWalletVMs: Omit<ChainVM, 'hypevm' | 'lvm'>[]
  /** The linked wallet that matches the current user address */
  linkedWallet?: LinkedWallet
  /** True if the recipient address belongs to a linked wallet */
  isRecipientLinked?: boolean

  // ── Fee/routing ──────────────────────────────────────────────────────────────
  /** True if the relayer service fee is unusually high (>1.5% and >$25) */
  highRelayerServiceFee: boolean
  /** Relayer fee as a percentage of input amount (0–100 as bigint) */
  relayerFeeProportion: bigint

  // ── Address ──────────────────────────────────────────────────────────────────
  /** The user's current wallet address (EVM or adapted) */
  address?: Address | string
  /** The resolved swap recipient address */
  recipient?: Address | string
  /** Custom override for the recipient address */
  customToAddress?: Address | string
  setCustomToAddress: (address?: Address | string) => void
  /** Display name for the recipient (ENS or truncated address) */
  toDisplayName?: string

  // ── Slippage ─────────────────────────────────────────────────────────────────
  /** Current slippage tolerance value (undefined = auto) */
  slippageTolerance?: string
  setSlippageTolerance: (value?: string) => void

  // ── Gas top-up ───────────────────────────────────────────────────────────────
  /** Whether gas top-up is enabled by the user */
  gasTopUpEnabled: boolean
  setGasTopUpEnabled: (enabled: boolean) => void
  gasTopUpBalance?: bigint
  gasTopUpRequired: boolean
  gasTopUpAmount?: bigint
  gasTopUpAmountUsd?: string

  // ── Execution state ──────────────────────────────────────────────────────────
  /** Current execution steps from the relay SDK */
  steps: Execute['steps'] | null
  setSteps: (steps: Execute['steps'] | null) => void
  /** Error from the last failed swap execution */
  swapError: Error | null
  setSwapError: (error: Error | null) => void
  /** Details from the completed/in-progress execution */
  details: Execute['details'] | null
  setDetails: (details: Execute['details'] | null) => void
  /** The Execute object for the swap that is currently in progress */
  quoteInProgress: Execute | null
  setQuoteInProgress: (quote: Execute | null) => void
  /** AbortController for the current in-flight swap (used to cancel) */
  abortController: AbortController | null

  // ── CTA ──────────────────────────────────────────────────────────────────────
  /** The text to display on the main swap button */
  ctaCopy: string

  // ── Actions ──────────────────────────────────────────────────────────────────
  /** Execute the swap — opens the transaction modal and runs the relay SDK */
  swap: () => Promise<void>
  /** Invalidates balance queries so they refresh after a swap */
  invalidateBalanceQueries: () => void
  /** Invalidates the quote query to force a fresh quote */
  invalidateQuoteQuery: () => void

  // ── Transaction modal state ──────────────────────────────────────────────────
  /** Whether the transaction confirmation modal is open */
  transactionModalOpen: boolean
  setTransactionModalOpen: (open: boolean) => void
  /** Whether the deposit address modal is open (non-EVM flows) */
  depositAddressModalOpen: boolean

  // ── Raw client access ────────────────────────────────────────────────────────
  /** The initialized RelayClient instance from context */
  relayClient: RelayClient | null
}

// ─── Main hook ────────────────────────────────────────────────────────────────

/**
 * The main headless hook for the Relay swap widget.
 *
 * Encapsulates all swap state, quote fetching, fee parsing, balance loading,
 * analytics event firing, and swap execution. The UI layer should be purely
 * presentational — it reads from this hook's return value and calls its actions.
 *
 * @example
 * // Default usage inside SwapWidget.tsx:
 * const swapState = useSwapWidget({ supportedWalletVMs: ['evm'] })
 *
 * // Custom UI usage:
 * const { ctaCopy, swap, fromToken, toToken, ... } = useSwapWidget(options)
 */
export function useSwapWidget(options: UseSwapWidgetOptions): UseSwapWidgetReturn {
  const {
    fromToken: _fromToken,
    setFromToken: _setFromToken,
    toToken: _toToken,
    setToToken: _setToToken,
    defaultToAddress,
    defaultAmount,
    defaultTradeType,
    slippageTolerance: _slippageTolerance,
    wallet,
    linkedWallets,
    multiWalletSupportEnabled = false,
    supportedWalletVMs,
    onAnalyticEvent,
    onSwapError,
    onSwapSuccess,
    useSecureBaseUrl,
    originAddressOverride
  } = options

  // ── Context ──────────────────────────────────────────────────────────────────
  const relayClient = useRelayClient()
  const providerOptions = useContext(ProviderOptionsContext)
  const connectorKeyOverrides = providerOptions.vmConnectorKeyOverrides
  const queryClient = useQueryClient()

  // ── Wallet ───────────────────────────────────────────────────────────────────
  const { connector } = useAccount()
  const walletClient = useWalletClient()
  const address = useWalletAddress(wallet, linkedWallets)

  // ── Token state (controlled/uncontrolled) ────────────────────────────────────
  const [fromToken, setFromToken] = useFallbackState<Token | undefined>(
    _setFromToken ? _fromToken : undefined,
    _setFromToken
      ? [_fromToken, _setFromToken as React.Dispatch<React.SetStateAction<Token | undefined>>]
      : undefined
  )
  const [toToken, setToToken] = useFallbackState<Token | undefined>(
    _setToToken ? _toToken : undefined,
    _setToToken
      ? [_toToken, _setToToken as React.Dispatch<React.SetStateAction<Token | undefined>>]
      : undefined
  )

  // ── Core state ───────────────────────────────────────────────────────────────
  const [customToAddress, setCustomToAddress] = useState<Address | string | undefined>(defaultToAddress)
  const [tradeType, setTradeType] = useState<TradeType>(defaultTradeType ?? 'EXACT_INPUT')
  const [steps, setSteps] = useState<Execute['steps'] | null>(null)
  const [quoteInProgress, setQuoteInProgress] = useState<Execute | null>(null)
  const [details, setDetails] = useState<Execute['details'] | null>(null)
  const [gasTopUpEnabled, setGasTopUpEnabled] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [swapError, setSwapError] = useState<Error | null>(null)
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)
  const depositAddressModalOpen = false // Extended in full implementation
  const [currentSlippageTolerance, setCurrentSlippageTolerance] = useState<string | undefined>(_slippageTolerance)

  // Sync external slippage prop
  useEffect(() => {
    setCurrentSlippageTolerance(_slippageTolerance)
  }, [_slippageTolerance])

  // ── Amount state (debounced) ──────────────────────────────────────────────────
  const {
    value: amountInputValue,
    debouncedValue: debouncedInputAmountValue,
    setValue: setAmountInputValue,
    debouncedControls: debouncedAmountInputControls
  } = useDebounceState<string>(
    !defaultTradeType || defaultTradeType === 'EXACT_INPUT' ? (defaultAmount ?? '') : '',
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

  // ── Chain resolution ─────────────────────────────────────────────────────────
  const fromChain = relayClient?.chains?.find((c) => c.id === fromToken?.chainId)
  const toChain = relayClient?.chains?.find((c) => c.id === toToken?.chainId)

  // Find the linked wallet that matches each chain's VM type
  const fromLinkedWallet = linkedWallets?.find(
    (w) => fromChain?.vmType && isWalletVmTypeCompatible(w.vmType, fromChain.vmType as ChainVM)
  )
  const toLinkedWallet = linkedWallets?.find(
    (w) => toChain?.vmType && isWalletVmTypeCompatible(w.vmType, toChain.vmType as ChainVM)
  )

  // fromChainWalletVMSupported: true only if there is an actual connected wallet for this VM type
  const fromChainWalletVMSupported: boolean = (() => {
    if (!fromChain?.vmType) return false
    if (fromChain.id === 1337) return true
    if (fromChain.vmType === 'evm' || fromChain.vmType === 'hypevm') return !!address
    return !!fromLinkedWallet
  })()

  // toChainWalletVMSupported: same logic for the destination chain
  const toChainWalletVMSupported: boolean = (() => {
    if (!toChain?.vmType) return false
    if (toChain.vmType === 'evm' || toChain.vmType === 'hypevm') return !!address
    return !!toLinkedWallet
  })()

  // ── Multi-wallet resolution ───────────────────────────────────────────────────
  const linkedWallet = linkedWallets?.find(
    (lw) =>
      address === (lw.vmType === 'evm' ? lw.address.toLowerCase() : lw.address) ||
      lw.address === address
  )

  const defaultRecipient = useMemo(() => {
    if (!multiWalletSupportEnabled || !toChain || !linkedWallets) return undefined
    const _isValidTo = isValidAddress(toChain.vmType, customToAddress ?? '')
    if (!_isValidTo) {
      return findSupportedWallet(toChain, customToAddress, linkedWallets)
    }
    return undefined
  }, [multiWalletSupportEnabled, toChain, customToAddress, address, linkedWallets])

  const recipient = customToAddress ?? defaultRecipient ?? address

  // For non-EVM chains, prefer the linked wallet address over the EVM address
  const fromAddressWithFallback = (() => {
    if (fromChain?.vmType && fromChain.vmType !== 'evm' && fromChain.vmType !== 'hypevm' && fromLinkedWallet) {
      return fromLinkedWallet.address
    }
    return addressWithFallback(fromChain?.vmType, address)
  })()

  // ── Address validity ──────────────────────────────────────────────────────────
  // Use the resolved from-address (auto-resolves non-EVM from linkedWallets)
  const resolvedFromAddress = originAddressOverride ?? fromAddressWithFallback
  const isValidFromAddress = isValidAddress(fromChain?.vmType, resolvedFromAddress ?? '', fromChain?.id)
  const isValidToAddress = isValidAddress(toChain?.vmType, recipient ?? '', toChain?.id)

  const toAddressWithFallback = (() => {
    if (toChain?.vmType && toChain.vmType !== 'evm' && toChain.vmType !== 'hypevm' && toLinkedWallet) {
      return toLinkedWallet.address
    }
    return addressWithFallback(toChain?.vmType, recipient)
  })()

  // Display name for recipient (simplified — no ENS in this version)
  const toDisplayName = recipient
    ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}`
    : undefined

  // ── Balances ─────────────────────────────────────────────────────────────────
  const {
    value: fromBalance,
    queryKey: fromBalanceQueryKey,
    isLoading: isLoadingFromBalance,
    hasPendingBalance: fromBalancePending,
    isDuneBalance: fromBalanceIsDune
  } = useCurrencyBalance({
    chain: fromChain,
    address: address,
    currency: fromToken?.address,
    enabled: fromToken !== undefined,
    refreshInterval: undefined,
    wallet
  })

  const {
    value: toBalance,
    queryKey: toBalanceQueryKey,
    isLoading: isLoadingToBalance,
    hasPendingBalance: toBalancePending,
    isDuneBalance: toBalanceIsDune
  } = useCurrencyBalance({
    chain: toChain,
    address: recipient,
    currency: toToken?.address,
    enabled: toToken !== undefined,
    refreshInterval: undefined,
    wallet
  })

  // ── Token prices ──────────────────────────────────────────────────────────────
  const { data: fromTokenPriceData, isLoading: isLoadingFromTokenPrice } = useTokenPrice(
    relayClient?.baseApiUrl,
    {
      address: fromToken?.address ?? '',
      chainId: fromToken?.chainId ?? 0,
      referrer: relayClient?.source
    },
    {
      enabled: !!(fromToken?.address && fromToken.chainId),
      ...TOKEN_PRICE_QUERY_OPTIONS
    }
  )

  const { data: toTokenPriceData, isLoading: isLoadingToTokenPrice } = useTokenPrice(
    relayClient?.baseApiUrl,
    {
      address: toToken?.address ?? '',
      chainId: toToken?.chainId ?? 0,
      referrer: relayClient?.source
    },
    {
      enabled: !!(toToken?.address && toToken.chainId),
      ...TOKEN_PRICE_QUERY_OPTIONS
    }
  )

  // ── Misc flags ────────────────────────────────────────────────────────────────
  const isFromNative = fromToken?.address === fromChain?.currency?.address
  const isSvmSwap = fromChain?.vmType === 'svm' || toChain?.vmType === 'svm'
  const isBvmSwap = fromChain?.vmType === 'bvm' || toChain?.vmType === 'bvm'
  const isRecipientLinked = linkedWallets?.some((w) => w.address === recipient)

  // ── Quote parameters ──────────────────────────────────────────────────────────
  const quoteParameters: Parameters<typeof useQuote>['2'] =
    fromToken && toToken
      ? {
          user: resolvedFromAddress ?? '',
          originChainId: fromToken.chainId,
          destinationChainId: toToken.chainId,
          originCurrency: fromToken.address,
          destinationCurrency: toToken.address,
          recipient: toAddressWithFallback,
          tradeType,
          appFees: providerOptions.appFees,
          amount:
            tradeType === 'EXACT_INPUT'
              ? parseUnits(debouncedInputAmountValue || '0', fromToken.decimals).toString()
              : parseUnits(debouncedOutputAmountValue || '0', toToken.decimals).toString(),
          referrer: relayClient?.source ?? undefined,
          useDepositAddress: !fromChainWalletVMSupported,
          slippageTolerance: currentSlippageTolerance,
          topupGas: gasTopUpEnabled && false // gasTopUpRequired
        }
      : undefined

  // ── Quote fetching ────────────────────────────────────────────────────────────
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
      !depositAddressModalOpen
  )

  const onQuoteRequested: Parameters<typeof useQuote>['3'] = (params) => {
    // Analytics: quote request initiated
    onAnalyticEvent?.(EventNames.QUOTE_REQUESTED, {
      parameters: params,
      wallet_connector: linkedWallet?.connector,
      chain_id_in: params?.originChainId,
      chain_id_out: params?.destinationChainId
    })
  }

  const onQuoteReceived: Parameters<typeof useQuote>['4'] = ({ details: d, steps: s }, params) => {
    // Analytics: quote received from relay API
    onAnalyticEvent?.(EventNames.QUOTE_RECEIVED, {
      parameters: params,
      wallet_connector: linkedWallet?.connector,
      amount_in: d?.currencyIn?.amountFormatted,
      currency_in: d?.currencyIn?.currency?.symbol,
      chain_id_in: d?.currencyIn?.currency?.chainId,
      amount_out: d?.currencyOut?.amountFormatted,
      currency_out: d?.currencyOut?.currency?.symbol,
      chain_id_out: d?.currencyOut?.currency?.chainId,
      steps: s,
      quote_id: s ? extractQuoteId(s as Execute['steps']) : undefined
    })
  }

  const {
    data: _quoteData,
    error: quoteError,
    isFetching: isFetchingQuote,
    executeQuote: executeSwap,
    queryKey: quoteQueryKey
  } = useQuote(
    relayClient ?? undefined,
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
    (e: unknown) => {
      const err = e as { response?: { data?: { message?: string }; status?: number }; message?: string }
      const errorMessage = err?.response?.data?.message
        ? new Error(err.response.data.message).message
        : (err?.message ?? 'Unknown Error')
      onAnalyticEvent?.(EventNames.QUOTE_ERROR, {
        wallet_connector: linkedWallet?.connector,
        error_message: errorMessage,
        parameters: quoteParameters,
        status_code: err?.response?.status ?? ''
      })
    },
    undefined,
    useSecureBaseUrl?.(quoteParameters) ? providerOptions?.secureBaseUrl : undefined
  )

  const invalidateQuoteQuery = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: quoteQueryKey })
  }, [queryClient, quoteQueryKey])

  // Suppress error when a fresh quote or a pending fetch is available
  const error = _quoteData || (isFetchingQuote && quoteFetchingEnabled) ? null : quoteError
  const quote = error ? undefined : _quoteData

  // ── Sync output/input amount from quote ───────────────────────────────────────
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote, tradeType])

  // ── Fee breakdown ─────────────────────────────────────────────────────────────
  const feeBreakdown = useMemo<FeeBreakdown | null>(() => {
    if (!fromToken || !toToken || !fromChain || !toChain || !quote) return null
    return parseFees(
      { id: fromChain.id, displayName: fromChain.displayName },
      { id: toChain.id, displayName: toChain.displayName },
      quote
    )
  }, [quote, fromToken, toToken, fromChain, toChain])

  // ── Validation ────────────────────────────────────────────────────────────────
  const totalAmount = BigInt(quote?.details?.currencyIn?.amount ?? 0n)

  const hasInsufficientBalance = Boolean(
    totalAmount &&
      address &&
      (fromBalance ?? 0n) < totalAmount &&
      fromChainWalletVMSupported
  )

  const fetchQuoteErrorMessage = error?.message ?? null
  const fetchQuoteDataErrorMessage =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? null

  const isInsufficientLiquidityError = Boolean(
    fetchQuoteErrorMessage?.includes('No quotes available')
  )
  const isCapacityExceededError = Boolean(
    fetchQuoteDataErrorMessage?.includes('Amount is higher than the available liquidity') ||
    fetchQuoteDataErrorMessage?.includes('Insufficient relayer liquidity')
  )
  const isCouldNotExecuteError = Boolean(
    fetchQuoteDataErrorMessage?.includes('Could not execute')
  )

  const highRelayerServiceFee = isHighRelayerServiceFee(quote)
  const relayerFeeProportion = calculateRelayerFeeProportion(quote)
  const timeEstimate = calculateTimeEstimate(quote?.details)

  const isSameCurrencySameRecipientSwap =
    fromToken?.address === toToken?.address &&
    fromToken?.chainId === toToken?.chainId &&
    address === recipient

  // ── CTA copy ──────────────────────────────────────────────────────────────────
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
    amountInputValue,
    amountOutputValue,
    debouncedInputAmountValue,
    debouncedOutputAmountValue,
    hasInsufficientBalance,
    isInsufficientLiquidityError,
    isFetchingQuote,
    quote,
    operation: quote?.details?.operation
  })

  // ── Balance invalidation ──────────────────────────────────────────────────────
  const invalidateBalanceQueries = useCallback(() => {
    const invalidatePeriodically = (fn: () => void) => {
      let count = 0
      const max = 4
      const timer = setInterval(() => {
        if (count >= max) { clearInterval(timer); return }
        count++
        fn()
      }, 3000)
    }

    queryClient.invalidateQueries({ queryKey: ['useDuneBalances'] })

    if (fromBalanceIsDune) {
      invalidatePeriodically(() =>
        queryClient.invalidateQueries({ queryKey: fromBalanceQueryKey })
      )
    } else {
      queryClient.invalidateQueries({ queryKey: fromBalanceQueryKey })
    }

    if (toBalanceIsDune) {
      invalidatePeriodically(() =>
        queryClient.invalidateQueries({ queryKey: toBalanceQueryKey })
      )
    } else {
      queryClient.invalidateQueries({ queryKey: toBalanceQueryKey })
    }
  }, [queryClient, fromBalanceQueryKey, toBalanceQueryKey, toBalanceIsDune, fromBalanceIsDune, address])

  // ── Swap execution ────────────────────────────────────────────────────────────
  const swap = useCallback(async () => {
    let submittedEvents: string[] = []

    /** Handles swap errors and fires the appropriate analytics events */
    const swapErrorHandler = (err: unknown, currentSteps?: Execute['steps'] | null) => {
      const e = err as { message?: string; response?: { data?: { message?: string } }; name?: string }
      const errorMessage = e?.response?.data?.message
        ? new Error(e.response.data.message).message
        : (e?.message ?? 'Unknown Error')

      // User-rejected: close modal silently
      const isRejected = (
        e?.message?.includes('rejected') ||
        (typeof err === 'string' && (err.includes('rejected') || err.includes('Approval Denied'))) ||
        e?.message?.includes('Approval Denied') ||
        e?.message?.includes('Plugin Closed') ||
        e?.message?.includes('denied transaction')
      )

      if (isRejected) {
        setTransactionModalOpen(false)
        onAnalyticEvent?.(EventNames.USER_REJECTED_WALLET, { error_message: errorMessage })
        return
      }

      const currentStep = currentSteps?.find((s) =>
        s.items?.some((item) => item.status === 'incomplete')
      )
      const currentStepItem = currentStep?.items?.find((item) => item.status === 'incomplete')

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

      const isApproval = currentStep?.id === 'approve'
      const errorEvent = isApproval ? EventNames.APPROVAL_ERROR : EventNames.DEPOSIT_ERROR

      const isTransactionConfirmationError =
        e?.message?.includes('TransactionConfirmationError') ||
        e?.name?.includes('TransactionConfirmationError')

      if (
        currentStepItem?.receipt &&
        currentStepItem.check &&
        !isTransactionConfirmationError
      ) {
        const successEvent = isApproval ? EventNames.APPROVAL_SUCCESS : EventNames.DEPOSIT_SUCCESS
        if (!submittedEvents.includes(successEvent)) {
          onAnalyticEvent?.(successEvent, swapEventData as Record<string, unknown>)
          submittedEvents.push(successEvent)
          setTimeout(() => onAnalyticEvent?.(EventNames.FILL_ERROR, swapEventData as Record<string, unknown>), 20)
        } else {
          onAnalyticEvent?.(EventNames.FILL_ERROR, swapEventData as Record<string, unknown>)
        }
      } else if (!currentStepItem?.receipt) {
        onAnalyticEvent?.(errorEvent, swapEventData as Record<string, unknown>)
      } else {
        onAnalyticEvent?.(EventNames.SWAP_ERROR, swapEventData as Record<string, unknown>)
      }

      setSwapError(new Error(errorMessage))
      onSwapError?.(errorMessage, { ...quote, steps: currentSteps } as Execute)
    }

    try {
      const swapEventData = getSwapEventData(
        quote?.details,
        quote?.fees,
        quote?.steps ? (quote.steps as Execute['steps']) : null,
        linkedWallet?.connector,
        quoteParameters
      )

      // Analytics: user clicked the main CTA
      onAnalyticEvent?.(EventNames.SWAP_CTA_CLICKED, swapEventData as Record<string, unknown>)

      if (!executeSwap) throw new Error('Missing a quote')
      if (!wallet && !walletClient.data) throw new Error('Missing a wallet')

      setSteps(quote?.steps as Execute['steps'])
      setQuoteInProgress(quote as Execute)
      setTransactionModalOpen(true)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _wallet = wallet ?? adaptViemWallet(walletClient.data as any)

      const activeWalletChainId = await _wallet?.getChainId()
      let targetChainId = fromToken?.chainId
      if (fromToken?.chainId === 1337) {
        const activeChain = relayClient?.chains?.find((c) => c.id === activeWalletChainId)
        targetChainId = activeChain?.vmType !== 'evm' ? 1 : activeWalletChainId
      }

      if (fromToken && targetChainId && targetChainId !== activeWalletChainId) {
        // Analytics: wallet needs to switch networks
        onAnalyticEvent?.(EventNames.SWAP_SWITCH_NETWORK, { activeWalletChainId, ...swapEventData })
        await _wallet?.switchChain(targetChainId)
      }

      let _currentSteps: Execute['steps'] | undefined = undefined

      const execPromise = executeSwap(({ steps: currentSteps }) => {
        setSteps(currentSteps)
        _currentSteps = currentSteps

        const { step, stepItem } = (() => {
          const s = currentSteps.find((s) => s.items?.some((i) => i.status === 'incomplete'))
          const si = s?.items?.find((i) => i.status === 'incomplete')
          return { step: s, stepItem: si }
        })()

        const stepEventData = getSwapEventData(
          quote?.details,
          quote?.fees,
          currentSteps,
          linkedWallet?.connector,
          quoteParameters
        )

        if (step && stepItem) {
          const isApproval = step.id === 'approve' || (step.id as string) === 'approval'
          let submittedEvent: string = isApproval ? EventNames.APPROVAL_SUBMITTED : EventNames.DEPOSIT_SUBMITTED
          const successEvent = isApproval ? EventNames.APPROVAL_SUCCESS : EventNames.DEPOSIT_SUCCESS
          const isBatch = Array.isArray(step.items) && step.items.length > 1 && !!wallet?.handleBatchTransactionStep

          if (!isApproval && isBatch) submittedEvent = EventNames.BATCH_TX_SUBMITTED

          if (!submittedEvents.includes(submittedEvent) && !stepItem.receipt && stepItem?.txHashes?.length) {
            submittedEvents.push(submittedEvent)
            onAnalyticEvent?.(submittedEvent, stepEventData as Record<string, unknown>)
          } else if (!submittedEvents.includes(successEvent) && (stepItem.receipt || stepItem.checkStatus === 'pending')) {
            onAnalyticEvent?.(successEvent, stepEventData as Record<string, unknown>)
            submittedEvents.push(successEvent)
          }

          if (stepItem.status === 'complete' && stepItem.check && !submittedEvents.includes(EventNames.FILL_SUCCESS)) {
            if (!submittedEvents.includes(EventNames.DEPOSIT_SUCCESS) && !isBatch) {
              onAnalyticEvent?.(EventNames.DEPOSIT_SUCCESS, stepEventData as Record<string, unknown>)
              submittedEvents.push(EventNames.DEPOSIT_SUCCESS)
              setTimeout(() => onAnalyticEvent?.(EventNames.FILL_SUCCESS, stepEventData as Record<string, unknown>), 20)
            } else {
              onAnalyticEvent?.(EventNames.FILL_SUCCESS, stepEventData as Record<string, unknown>)
            }
            submittedEvents.push(EventNames.FILL_SUCCESS)
          }
        } else if (
          currentSteps.every((s) => s.items?.every((i) => i.status === 'complete')) &&
          !submittedEvents.includes(EventNames.FILL_SUCCESS)
        ) {
          if (!submittedEvents.includes(EventNames.DEPOSIT_SUCCESS) && !submittedEvents.includes(EventNames.BATCH_TX_SUBMITTED)) {
            onAnalyticEvent?.(EventNames.DEPOSIT_SUCCESS, stepEventData as Record<string, unknown>)
            submittedEvents.push(EventNames.DEPOSIT_SUCCESS)
            setTimeout(() => onAnalyticEvent?.(EventNames.FILL_SUCCESS, stepEventData as Record<string, unknown>), 20)
          } else {
            onAnalyticEvent?.(EventNames.FILL_SUCCESS, stepEventData as Record<string, unknown>)
          }
          submittedEvents.push(EventNames.FILL_SUCCESS)
        }
      })

      // Store abort controller for potential cancellation
      if (execPromise && typeof execPromise === 'object' && 'abortController' in execPromise) {
        setAbortController((execPromise as { abortController: AbortController }).abortController)
      }

      execPromise
        ?.catch((err: unknown) => swapErrorHandler(err, _currentSteps))
        .finally(() => {
          setAbortController(null)
          invalidateBalanceQueries()
        })
    } catch (err: unknown) {
      swapErrorHandler(err)
    }
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
    executeSwap,
    setSteps,
    setQuoteInProgress,
    invalidateBalanceQueries,
    linkedWallet,
    abortController,
    quote,
    quoteParameters,
    onAnalyticEvent,
    onSwapError
  ])

  return {
    // Token state
    fromToken,
    setFromToken,
    toToken,
    setToToken,
    // Amount state
    amountInputValue,
    setAmountInputValue,
    debouncedInputAmountValue,
    amountOutputValue,
    setAmountOutputValue,
    debouncedOutputAmountValue,
    tradeType,
    setTradeType,
    // Quote
    quote,
    isFetchingQuote,
    quoteError: error,
    feeBreakdown,
    timeEstimate,
    quoteParameters,
    // Balances
    fromBalance,
    fromBalancePending,
    isLoadingFromBalance,
    toBalance,
    toBalancePending,
    isLoadingToBalance,
    // Token prices
    fromTokenPriceData,
    toTokenPriceData,
    isLoadingFromTokenPrice,
    isLoadingToTokenPrice,
    // Validation
    hasInsufficientBalance,
    isInsufficientLiquidityError,
    isCapacityExceededError,
    isCouldNotExecuteError,
    isSameCurrencySameRecipientSwap,
    isValidFromAddress,
    isValidToAddress,
    // Multi-wallet
    isFromNative,
    isSvmSwap,
    isBvmSwap,
    fromChainWalletVMSupported,
    toChainWalletVMSupported,
    supportedWalletVMs,
    linkedWallet,
    isRecipientLinked,
    // Fee/routing
    highRelayerServiceFee,
    relayerFeeProportion,
    // Address
    address,
    recipient,
    customToAddress,
    setCustomToAddress,
    toDisplayName,
    // Slippage
    slippageTolerance: currentSlippageTolerance,
    setSlippageTolerance: setCurrentSlippageTolerance,
    // Gas top-up (simplified — full implementation in relay-kit-ui)
    gasTopUpEnabled,
    setGasTopUpEnabled,
    gasTopUpBalance: undefined,
    gasTopUpRequired: false,
    gasTopUpAmount: undefined,
    gasTopUpAmountUsd: undefined,
    // Execution state
    steps,
    setSteps,
    swapError,
    setSwapError,
    details,
    setDetails,
    quoteInProgress,
    setQuoteInProgress,
    abortController,
    // CTA
    ctaCopy,
    // Actions
    swap,
    invalidateBalanceQueries,
    invalidateQuoteQuery,
    // Modal state
    transactionModalOpen,
    setTransactionModalOpen,
    depositAddressModalOpen,
    // Raw client
    relayClient
  }
}
