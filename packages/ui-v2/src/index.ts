// ─── Provider ────────────────────────────────────────────────────────────────
export { RelayKitProvider } from './providers/RelayKitProvider.js'
export { RelayClientProvider } from './providers/RelayClientProvider.js'
export type { RelayKitProviderProps, RelayKitProviderOptions, AppFees } from './providers/RelayKitProvider.js'

// ─── Main widget ─────────────────────────────────────────────────────────────
export { SwapWidget } from './components/swap/SwapWidget.js'
export type { SwapWidgetProps } from './components/swap/SwapWidget.js'

// ─── Headless hook (for custom UI implementations) ───────────────────────────
export { useSwapWidget } from './hooks/useSwapWidget.js'
export type { UseSwapWidgetOptions, UseSwapWidgetReturn } from './hooks/useSwapWidget.js'

// ─── Sub-components (composable building blocks) ─────────────────────────────
export { TokenPanel } from './components/swap/TokenPanel.js'
export { TokenSelector } from './components/swap/TokenSelector.js'
export { ChainFilter } from './components/swap/ChainFilter.js'
export { FeeBreakdown } from './components/swap/FeeBreakdown.js'
export { SwapButton } from './components/swap/SwapButton.js'
export { SwapArrow } from './components/swap/SwapArrow.js'
export { SlippageConfig } from './components/swap/SlippageConfig.js'
export { RecipientSelector } from './components/swap/RecipientSelector.js'
export { OriginWalletSelector } from './components/swap/OriginWalletSelector.js'
export { CustomAddressModal } from './components/swap/CustomAddressModal.js'
export { AmountModeToggle } from './components/swap/AmountModeToggle.js'
export { BalanceDisplay } from './components/swap/BalanceDisplay.js'
export { AmountInput } from './components/swap/AmountInput.js'
export { TransactionModal } from './components/transaction/TransactionModal.js'

// ─── UI primitives ────────────────────────────────────────────────────────────
export { Button } from './components/ui/button.js'
export { Input } from './components/ui/input.js'
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogTrigger,
  DialogCloseButton
} from './components/ui/dialog.js'
export { Badge } from './components/ui/badge.js'
export { Skeleton } from './components/ui/skeleton.js'
export { Switch } from './components/ui/switch.js'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs.js'
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/ui/tooltip.js'

// ─── Individual hooks ────────────────────────────────────────────────────────
export { useRelayClient } from './hooks/useRelayClient.js'
export { useCurrencyBalance } from './hooks/useCurrencyBalance.js'
export { useSwapButtonCta } from './hooks/useSwapButtonCta.js'
export { useFallbackState } from './hooks/useFallbackState.js'
export { useStarredChains } from './hooks/useStarredChains.js'
export { useWalletAddress } from './hooks/useWalletAddress.js'
export { useDebounceState } from './hooks/useDebounceState.js'
export { useENSResolver } from './hooks/useENSResolver.js'
export { useLighterAccount } from './hooks/useLighterAccount.js'
export type { LighterAccount } from './hooks/useLighterAccount.js'
export { useIsDarkMode } from './hooks/useIsDarkMode.js'

// ─── Types ────────────────────────────────────────────────────────────────────
export type { Token, LinkedWallet } from './types/token.js'
export type { TradeType } from './types/swap.js'
export type { FeeBreakdown as FeeBreakdownType, BridgeFee } from './types/fee.js'

// ─── Constants ────────────────────────────────────────────────────────────────
export { EventNames } from './constants/events.js'
export type { EventName } from './constants/events.js'

// ─── Utilities ────────────────────────────────────────────────────────────────
export { cn } from './lib/utils.js'
export { formatDollar, formatDollarCompact, formatNumber, formatBN, convertBpsToPercent } from './lib/format.js'
export { isChainStarred, toggleStarredChain, getStarredChainIds, alreadyAcceptedToken, acceptUnverifiedToken, addCustomAddress, getCustomAddresses } from './lib/localStorage.js'
export { isENSName, isLighterAddress, isValidAddress, isWalletVmTypeCompatible, truncateAddress } from './lib/address.js'

// ─── Images ───────────────────────────────────────────────────────────────────
export { AllChainsLogo } from './components/swap/AllChainsLogo.js'
export { ChainTokenIcon } from './components/swap/ChainTokenIcon.js'

// ─── Additional hooks ────────────────────────────────────────────────────────
export { useDuneBalances } from './hooks/useDuneBalances.js'
export type { DuneBalance, DuneBalanceResponse, BalanceMap } from './hooks/useDuneBalances.js'
