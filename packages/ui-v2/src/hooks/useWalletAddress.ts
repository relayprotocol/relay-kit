import { useAccount } from 'wagmi'
import type { AdaptedWallet } from '@relayprotocol/relay-sdk'
import type { LinkedWallet } from '@/types/token.js'
import { useEffect, useState } from 'react'

/**
 * Resolves the active wallet address across EVM and non-EVM VMs.
 *
 * Resolution order:
 * 1. If an AdaptedWallet is provided, use its address (supports any VM type)
 * 2. Otherwise fall back to the connected wagmi EVM address
 *
 * @param wallet - Optional AdaptedWallet from a custom wallet integration
 * @param linkedWallets - Optional list of linked wallets (multi-VM support)
 */
export function useWalletAddress(
  wallet?: AdaptedWallet,
  linkedWallets?: LinkedWallet[]
): string | undefined {
  const { address: evmAddress } = useAccount()
  const [adaptedAddress, setAdaptedAddress] = useState<string | undefined>(
    undefined
  )

  useEffect(() => {
    if (wallet?.address) {
      // AdaptedWallet exposes address synchronously or async
      if (typeof wallet.address === 'string') {
        setAdaptedAddress(wallet.address)
      } else if (typeof wallet.address === 'function') {
        // Some wallet adapters return a Promise
        Promise.resolve((wallet as unknown as { address: () => Promise<string> }).address()).then(
          (addr) => setAdaptedAddress(addr)
        ).catch(() => setAdaptedAddress(undefined))
      }
    } else {
      setAdaptedAddress(undefined)
    }
  }, [wallet])

  if (adaptedAddress) return adaptedAddress
  if (evmAddress) return evmAddress.toLowerCase()
  return undefined
}
