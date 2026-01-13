import {
  useQuery,
  useQueryClient,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'
import { isAddress } from 'viem'

type LighterAccount = {
  code: number
  account_type: number
  index: number
  l1_address: string
  status: number
  collateral: string
  available_balance: string
  total_asset_value: string
}

type LighterAccountResponse = {
  code: number
  total: number
  accounts: LighterAccount[]
}

type QueryType = typeof useQuery<
  LighterAccount | null,
  DefaultError,
  LighterAccount | null,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

/**
 * Fetches Lighter account info by either account index or EVM address.
 * Auto-detects the lookup type based on the input value.
 * Caches bidirectionally (both index and l1_address point to same data).
 */
export default (value?: string, queryOptions?: Partial<QueryOptions>) => {
  const queryClient = useQueryClient()

  // Auto-detect lookup type and normalize (lowercase for EVM addresses)
  const isEvmAddress = value ? isAddress(value) : false
  const isLighterIndex = value ? /^\d+$/.test(value) : false
  const by = isEvmAddress ? 'l1_address' : 'index'
  const normalizedValue = isEvmAddress ? value?.toLowerCase() : value

  return (useQuery as QueryType)({
    queryKey: ['useLighterAccount', normalizedValue],
    queryFn: async (): Promise<LighterAccount | null> => {
      // For index lookups, check if we already have data cached (from a previous EVM lookup)
      if (isLighterIndex) {
        const allQueries = queryClient.getQueriesData<LighterAccount | null>({
          queryKey: ['useLighterAccount']
        })
        for (const [, cachedAccount] of allQueries) {
          if (cachedAccount && cachedAccount.index?.toString() === value) {
            return cachedAccount
          }
        }
      }

      const url = new URL('https://mainnet.zklighter.elliot.ai/api/v1/account')
      url.searchParams.set('by', by)
      url.searchParams.set('value', value!)

      const response = await fetch(url.toString())
      if (!response.ok) return null

      const data: LighterAccountResponse = await response.json()
      if (data.code !== 200 || !data.accounts?.length) return null

      const account = data.accounts[0]

      // Bidirectional caching: cache under both index and l1_address (normalized)
      const otherKey = isEvmAddress
        ? account.index.toString()
        : account.l1_address.toLowerCase()

      if (otherKey && otherKey !== normalizedValue) {
        queryClient.setQueryData(['useLighterAccount', otherKey], account)
      }

      return account
    },
    ...queryOptions,
    enabled:
      value && (isEvmAddress || isLighterIndex)
        ? queryOptions?.enabled !== undefined
          ? queryOptions.enabled
          : true
        : false
  })
}
