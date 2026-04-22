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

const useHyperliquidAccountMode = (address?: string, enabled = true) => {
  const isEvmAddress = isAddress(address ?? '')

  const query = useQuery<HyperliquidAccountMode>({
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

  // If the mode query errors out (after retries), fall back to 'default' so
  // downstream balance queries aren't blocked.
  const data =
    query.data ??
    (query.isError ? ('default' as HyperliquidAccountMode) : undefined)

  return {
    ...query,
    data
  }
}

export default useHyperliquidAccountMode
