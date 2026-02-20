import { useMemo } from 'react'
import type { Token } from '@/types/token.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import type { useQuote } from '@relayprotocol/relay-kit-hooks'

export type UseSwapButtonCtaParams = {
  fromToken?: Token
  toToken?: Token
  multiWalletSupportEnabled?: boolean
  isValidFromAddress: boolean
  fromChainWalletVMSupported: boolean
  isValidToAddress: boolean
  toChainWalletVMSupported: boolean
  fromChain?: RelayChain
  toChain?: RelayChain
  isSameCurrencySameRecipientSwap: boolean
  /** Immediate (non-debounced) from-amount — used to suppress "Enter an amount" while typing */
  amountInputValue?: string
  /** Immediate (non-debounced) to-amount */
  amountOutputValue?: string
  debouncedInputAmountValue?: string
  debouncedOutputAmountValue?: string
  hasInsufficientBalance: boolean
  isInsufficientLiquidityError: boolean
  isFetchingQuote?: boolean
  quote: ReturnType<typeof useQuote>['data']
  operation?: string
}

/** Returns a human-readable label for a chain VM type */
function vmTypeLabel(vmType?: string): string {
  switch (vmType) {
    case 'evm': return 'EVM'
    case 'svm': return 'Solana'
    case 'bvm': return 'Bitcoin'
    case 'lvm': return 'Lighter'
    case 'hypevm': return 'HyperEVM'
    case 'tvm': return 'TON'
    case 'suivm': return 'Sui'
    default: return vmType ?? 'compatible'
  }
}

/**
 * Determines the appropriate CTA text for the swap button based on the
 * current widget state. Returns a user-facing string like "Swap", "Bridge",
 * "Insufficient Balance", "Select a token", etc.
 *
 * Priority order (highest to lowest):
 * 1. Missing token selection
 * 2. From-chain wallet not connected (wrong VM type)
 * 3. Multi-wallet: missing from-address
 * 4. Multi-wallet or non-EVM: missing to-address
 * 5. Same currency same recipient (invalid)
 * 6. Missing amount (only if user hasn't typed anything)
 * 7. Fetching quote
 * 8. Insufficient balance
 * 9. Insufficient liquidity
 * 10. Approval needed
 * 11. Operation-specific label
 */
export function useSwapButtonCta({
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
  operation
}: UseSwapButtonCtaParams): string {
  const firstStep = quote?.steps?.[0]
  const firstStepItem = firstStep?.items?.[0]

  return useMemo(() => {
    if (!fromToken || !toToken) {
      return 'Select a token'
    }

    // From-chain wallet not connected — wrong VM type or no wallet
    if (!fromChainWalletVMSupported) {
      const label = vmTypeLabel(fromChain?.vmType)
      return `Connect ${label} Wallet`
    }

    if (
      multiWalletSupportEnabled &&
      !isValidFromAddress &&
      fromChainWalletVMSupported
    ) {
      return `Select ${fromChain?.displayName} Wallet`
    }

    if (multiWalletSupportEnabled && !isValidToAddress) {
      return toChainWalletVMSupported
        ? `Select ${toChain?.displayName} Wallet`
        : `Enter ${toChain?.displayName} Address`
    }

    if (toChain?.vmType !== 'evm' && !isValidToAddress) {
      if (!toChainWalletVMSupported) {
        return `Connect ${vmTypeLabel(toChain?.vmType)} Wallet`
      }
      return `Enter ${toChain?.displayName ?? toChain?.vmType?.toUpperCase()} Address`
    }

    if (isSameCurrencySameRecipientSwap) {
      return 'Invalid recipient'
    }

    // Only show "Enter an amount" if the user has truly not typed anything
    const hasTypedAmount = !!(amountInputValue || amountOutputValue)
    if (!hasTypedAmount && !debouncedInputAmountValue && !debouncedOutputAmountValue) {
      return 'Enter an amount'
    }

    if (hasInsufficientBalance) {
      return 'Insufficient Balance'
    }

    if (isInsufficientLiquidityError) {
      return 'Insufficient Liquidity'
    }

    if (!toChainWalletVMSupported && !isValidToAddress) {
      return `Enter ${toChain?.displayName} Address`
    }

    if (firstStep?.id === 'approve' && firstStepItem?.status === 'incomplete') {
      return 'Approve & Swap'
    }

    switch (operation) {
      case 'wrap': return 'Wrap'
      case 'unwrap': return 'Unwrap'
      case 'send': return 'Send'
      case 'swap': return 'Swap'
      case 'bridge': return 'Bridge'
      default: return 'Confirm'
    }
  }, [
    fromToken,
    toToken,
    multiWalletSupportEnabled,
    isValidFromAddress,
    fromChainWalletVMSupported,
    isValidToAddress,
    toChainWalletVMSupported,
    toChain,
    fromChain,
    isSameCurrencySameRecipientSwap,
    amountInputValue,
    amountOutputValue,
    debouncedInputAmountValue,
    debouncedOutputAmountValue,
    hasInsufficientBalance,
    isInsufficientLiquidityError,
    isFetchingQuote,
    firstStep,
    firstStepItem,
    operation
  ])
}
