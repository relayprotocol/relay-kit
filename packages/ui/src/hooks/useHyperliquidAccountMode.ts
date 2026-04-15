import { isAddress } from 'viem'
import { useQuery } from '@tanstack/react-query'

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info'

// https://hyperliquid.gitbook.io/hyperliquid-docs/trading/account-abstraction-modes
export type HyperliquidAccountMode =
  | 'unifiedAccount'
  | 'portfolioMargin'
  | 'disabled'
  | 'default'
  | 'dexAbstraction'

export const isUnifiedMode = (mode?: HyperliquidAccountMode) =>
  mode === 'unifiedAccount' || mode === 'portfolioMargin'

const useHyperliquidAccountMode = (
  address?: string,
  enabled = true
) => {
  const isEvmAddress = isAddress(address ?? '')

  return useQuery<HyperliquidAccountMode>({
    queryKey: ['hyperliquidAccountMode', address],
    queryFn: async () => {
      const res = await fetch(HYPERLIQUID_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'userAbstraction',
          user: address
        })
      })
      return (await res.json()) as HyperliquidAccountMode
    },
    enabled: Boolean(address && isEvmAddress && enabled),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })
}

export default useHyperliquidAccountMode
