import { useMemo } from 'react'
import {
  NormalizedWalletName,
  WalletChainIncompatible,
  WalletChainRestricted
} from '../constants/walletCompatibility.js'
import type { LinkedWallet } from '../types/index.js'
import { isAddress } from 'viem'
import useIsAGW from './useIsAGW.js'
import useCexAddresses from './useCexAddresses.js'

export default (
  chainId?: number,
  address?: string,
  wallets?: LinkedWallet[],
  onAnalyticEvent?: (event: string, data: Record<string, any>) => void
) => {
  const normalizedAddress =
    address && isAddress(address) ? address.toLowerCase() : address
  const linkedWallet = wallets?.find(
    (wallet) =>
      (wallet.vmType === 'evm'
        ? wallet.address.toLowerCase()
        : wallet.address) === normalizedAddress
  )
  const isRecipientAGW = useIsAGW(address, !linkedWallet, onAnalyticEvent)
  const { data: cexAddresses } = useCexAddresses()
  const isRecipientCEX = cexAddresses?.addresses.includes(
    normalizedAddress ?? ''
  )

  return useMemo(() => {
    if (!chainId || !address) {
      return true
    }

    // Hyperliquid operates as a CEX, so wallet compatibility checks are skipped.
    // AGW recipients are still incompatible with Hyperliquid deposits.
    if (chainId === 1337) {
      return !isRecipientAGW
    }

    if (!linkedWallet) {
      if (isRecipientCEX) {
        return false
      }

      return isRecipientAGW ? chainId === 2741 : true
    }
    const normalizedWalletName =
      NormalizedWalletName[linkedWallet.connector] ?? linkedWallet.connector

    const incompatibleChains = WalletChainIncompatible[normalizedWalletName]
    if (incompatibleChains && incompatibleChains.includes(chainId)) {
      return false
    }

    const restrictedChains = WalletChainRestricted[normalizedWalletName]
    if (restrictedChains && !restrictedChains.includes(chainId)) {
      return false
    }

    return true
  }, [chainId, address, linkedWallet, isRecipientAGW, isRecipientCEX])
}
