/**
 * Represents a single fee component in the swap fee breakdown.
 */
export type BridgeFee = {
  /** Raw fee amount in token's smallest unit */
  raw: bigint
  /** Human-readable formatted amount (e.g., "0.00123") */
  formatted: string
  /** USD value with both numeric and formatted string representations */
  usd: {
    value: number
    formatted: string
  }
  /** Display name for this fee (e.g., "Relay Fee", "Deposit Gas (Ethereum)") */
  name: string
  /** Optional tooltip text explaining the fee */
  tooltip: string | null
  /** Category of fee: gas cost or relayer/protocol fee */
  type: 'gas' | 'relayer'
  /** Unique identifier used for referencing this fee (e.g., 'relayer-fee', 'origin-gas') */
  id: string
  /** The currency this fee is denominated in */
  currency?: {
    address?: string
    symbol?: string
    decimals?: number
    chainId?: number
  }
}

/**
 * Complete fee breakdown for a swap quote, including itemized fees
 * and a total impact summary.
 */
export type FeeBreakdown = {
  /** Itemized list of all fees */
  breakdown: BridgeFee[]
  /** Aggregated total fee and price impact summary */
  totalFees: {
    /** Total fees formatted as USD string (e.g., "$1.23") */
    usd?: string
    /** Price impact percentage string (e.g., "-0.5%") */
    priceImpactPercentage?: string
    /** Price impact in USD (e.g., "$0.15") */
    priceImpact?: string
    /** Semantic color category for displaying the price impact */
    priceImpactColor?: 'subtleSecondary' | 'red' | 'success'
    /** Swap-specific USD impact */
    swapImpact?: {
      value: number
      formatted: string
    }
  }
  /** True if the relay protocol is subsidizing gas for this transaction */
  isGasSponsored: boolean
}
