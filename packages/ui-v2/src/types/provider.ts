/**
 * App fee configuration for the relay protocol.
 * Allows the host app to collect fees on swaps routed through the widget.
 */
export type AppFees = {
  /** Fee recipient address */
  recipient: string
  /** Fee amount in basis points (e.g., 50 = 0.5%) */
  fee: string
}
