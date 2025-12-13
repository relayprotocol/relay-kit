import { isAddress, parseUnits } from 'viem'
import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'

export type HyperliquidMarginSummary = {
  accountValue?: string
  totalNtlPos?: string
  totalRawUsd?: string
  totalMarginUsed?: string
}

export type HyperLiquidPerpsResponse = {
  marginSummary?: HyperliquidMarginSummary
  crossMarginSummary?: HyperliquidMarginSummary
  crossMaintenanceMarginUsed?: string
  withdrawable?: string
  assetPositions?: any[]
  time?: number
}

export type HyperliquidSpotBalance = {
  coin: string
  token: number
  hold: string
  total: string
  entryNtl: string
}

export type HyperliquidSpotResponse = {
  balances: HyperliquidSpotBalance[]
}

type QueryType = typeof useQuery<
  string | undefined,
  DefaultError,
  string | undefined,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

// Perps USDC uses zero address
const PERPS_USDC_ADDRESS = '0x00000000000000000000000000000000'

// Map currency addresses to Hyperliquid spot coin symbols and decimals
const SPOT_TOKEN_CONFIG: Record<string, { coin: string; decimals: number }> = {
  '0x2e6d84f2d7ca82e6581e03523e4389f7': { coin: 'USDe', decimals: 2 },
  '0x54e00a5988577cb0b0c9ab0cb6ef7f4b': { coin: 'USDH', decimals: 2 }
}

export default (
  address?: string,
  currency: string = PERPS_USDC_ADDRESS,
  queryOptions?: Partial<QueryOptions>
) => {
  const isEvmAddress = isAddress(address ?? '')
  const isPerps = currency === PERPS_USDC_ADDRESS
  const spotConfig = SPOT_TOKEN_CONFIG[currency.toLowerCase()]
  const decimals = isPerps ? 8 : (spotConfig?.decimals ?? 2)

  const queryKey = ['useHyperliquidBalance', address, currency]

  const response = (useQuery as QueryType)({
    queryKey,
    queryFn: async () => {
      if (!address || !isEvmAddress) {
        return undefined
      }

      if (isPerps) {
        // Fetch perps balance
        const res = await fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'clearinghouseState',
            user: address
          })
        })
        const data = (await res.json()) as HyperLiquidPerpsResponse
        return data?.withdrawable
      } else if (spotConfig) {
        // Fetch spot balances
        const res = await fetch('https://api.hyperliquid.xyz/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'spotClearinghouseState',
            user: address
          })
        })
        const data = (await res.json()) as HyperliquidSpotResponse
        // Find the balance matching the coin symbol
        const tokenBalance = data?.balances?.find(
          (b) => b.coin.toLowerCase() === spotConfig.coin.toLowerCase()
        )
        return tokenBalance?.total
      }
      return undefined
    },
    enabled: address !== undefined && isEvmAddress,
    ...queryOptions
  })

  const balance = parseUnits(response.data ?? '0', decimals)

  return {
    ...response,
    balance,
    queryKey
  } as ReturnType<QueryType> & {
    balance: bigint
    queryKey: (string | undefined)[]
  }
}
