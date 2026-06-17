import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'

type QueryType = typeof useQuery<
  { balance: bigint } | undefined,
  DefaultError,
  { balance: bigint } | undefined,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

// Canonical public TON HTTP API. The Relay chain's httpRpcUrl points at a
// JSON-RPC gateway (drpc) that doesn't reliably serve `getAddressBalance`
// without a key, so we hit toncenter's REST endpoint directly — mirroring how
// the Tron balance hook hardcodes trongrid rather than using the chain RPC.
const TON_API_BASE = 'https://toncenter.com/api/v2'

/**
 * Fetches a wallet's native TON balance (in nanotons). TON launches with native
 * $TON only, so this does not handle Jettons.
 */
export default (address?: string, queryOptions?: Partial<QueryOptions>) => {
  const queryKey = ['useTonBalance', address]

  const response = (useQuery as QueryType)({
    queryKey,
    queryFn: async () => {
      if (!address) {
        return undefined
      }

      const res = await fetch(
        `${TON_API_BASE}/getAddressBalance?address=${encodeURIComponent(address)}`
      )
      const data = await res.json()

      if (!data.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Failed to fetch TON balance'
        )
      }

      // `result` is the balance in nanotons as a decimal string.
      return {
        balance: BigInt(data.result ?? 0)
      }
    },
    enabled: address !== undefined,
    ...queryOptions
  })

  return {
    ...response,
    balance: response.data?.balance,
    queryKey
  } as ReturnType<QueryType> & {
    balance: bigint | undefined
    queryKey: (string | undefined)[]
  }
}
