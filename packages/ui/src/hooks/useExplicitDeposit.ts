import { useEffect, useState, useRef, useCallback } from 'react'
import type { AdaptedWallet } from '@relayprotocol/relay-sdk'

const DEBOUNCE_DELAY_MS = 150 // 150ms debounce

/**
 * Hook to detect if explicit deposit should be enabled for a wallet
 * Uses balance and transaction count checks, plus EOA detection
 * RPC calls (code, balance, tx count) are cached at the SDK level
 * Wallet capabilities are always fetched fresh (wallet-provider specific)
 */
const useExplicitDeposit = (
  wallet?: AdaptedWallet,
  chainId?: number,
  chainVmType?: string,
  userAddress?: string
): boolean | undefined => {
  const [explicitDeposit, setExplicitDeposit] = useState<boolean | undefined>(
    undefined
  )
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )

  const checkExplicitDeposit = useCallback(async () => {
    if (!wallet || !chainId || chainVmType !== 'evm') {
      setExplicitDeposit(undefined)
      return
    }

    // Check if wallet has isEOA method (AdaptedWallet with EVM support)
    if (!wallet.isEOA) {
      // If wallet doesn't support isEOA, default to false (no explicit deposit)
      setExplicitDeposit(false)
      return
    }

    try {
      console.log('CHECKING EXPLICIT DEPOSIT')
      const { isEOA } = await wallet.isEOA(chainId)
      // isEOA: false means use explicit deposit
      const shouldUseExplicitDeposit = !isEOA
      setExplicitDeposit(shouldUseExplicitDeposit)
    } catch (error) {
      console.error('[Explicit Deposit] error', {
        chain_id: chainId,
        address: userAddress,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      // On error, default to true (explicit deposit enabled for safety)
      setExplicitDeposit(true)
    }
  }, [wallet, chainId, chainVmType, userAddress])

  useEffect(() => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Reset state when conditions change
    setExplicitDeposit(undefined)

    if (!wallet || !chainId || chainVmType !== 'evm') {
      return
    }

    // Debounce the check to avoid rapid re-calculations
    debounceTimerRef.current = setTimeout(() => {
      checkExplicitDeposit()
    }, DEBOUNCE_DELAY_MS)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [wallet, chainId, chainVmType, checkExplicitDeposit])

  return explicitDeposit
}

export default useExplicitDeposit
