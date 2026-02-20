import type { ChainVM } from '@relayprotocol/relay-sdk'

/**
 * Represents a cross-chain token with its chain context.
 * Mirrors the relay SDK's currency structure for UI consumption.
 */
export type Token = {
  /** The chain ID this token lives on */
  chainId: number
  /** Token contract address. Use the zero address for native tokens (ETH, etc.) */
  address: string
  name: string
  symbol: string
  decimals: number
  /** URL to the token's logo image */
  logoURI: string
  /** Whether this token has been verified by the relay protocol */
  verified?: boolean
}

/**
 * Represents a wallet linked to the user's primary wallet.
 * Used for multi-VM swap support (e.g., EVM + Solana simultaneously).
 */
export type LinkedWallet = {
  address: string
  vmType: ChainVM
  connector: string
  walletLogoUrl?: string
}
