import { useEffect, useState } from 'react'
import type { AdaptedWallet } from '@relayprotocol/relay-sdk'
import type { Address } from 'viem'
import { useConnection } from 'wagmi'
import type { LinkedWallet } from '../types/index.js'

export default function (
  wallet?: AdaptedWallet,
  linkedWallets?: LinkedWallet[]
): string | Address | undefined {
  const [address, setAddress] = useState<string | Address | undefined>()
  const { address: wagmiAddress } = useConnection()

  useEffect(() => {
    const getWalletAddress = async (wallet?: AdaptedWallet) => {
      if (wallet) {
        const walletAddress = await wallet.address()
        setAddress(walletAddress)
      } else {
        setAddress(undefined)
      }
    }

    getWalletAddress(wallet)
  }, [wallet, linkedWallets])

  return wallet ? address : wagmiAddress
}
