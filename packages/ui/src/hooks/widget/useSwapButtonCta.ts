import { useMemo } from 'react'
import type { Token } from '../../types'
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
  debouncedInputAmountValue?: string
  debouncedOutputAmountValue?: string
  hasInsufficientBalance: boolean
  isInsufficientLiquidityError: boolean
  quote: ReturnType<typeof useQuote>['data']
  operation?: string
}

/**
 * Hook to determine the swap button CTA text based on the current widget state
 * @param params - Configuration object containing swap state
 * @returns The appropriate button CTA text
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
  debouncedInputAmountValue,
  debouncedOutputAmountValue,
  hasInsufficientBalance,
  isInsufficientLiquidityError,
  quote,
  operation
}: UseSwapButtonCtaParams): string {
  const firstStep = quote?.steps?.[0]
  const firstStepItem = firstStep?.items?.[0]

  return useMemo(() => {
    if (!fromToken || !toToken) {
      return 'Select a token'
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
      return `Enter ${toChain?.displayName} Address`
    }

    if (isSameCurrencySameRecipientSwap) {
      return 'Invalid recipient'
    }

    if (!debouncedInputAmountValue || !debouncedOutputAmountValue) {
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
      case 'wrap':
        return 'Wrap'
      case 'unwrap':
        return 'Unwrap'
      case 'send':
        return 'Send'
      case 'swap':
        return 'Swap'
      case 'bridge':
        return 'Bridge'
      default:
        return 'Confirm'
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
    isSameCurrencySameRecipientSwap,
    debouncedInputAmountValue,
    debouncedOutputAmountValue,
    hasInsufficientBalance,
    isInsufficientLiquidityError,
    firstStep,
    operation
  ])
}
