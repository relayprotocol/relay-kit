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

/**
 * Fetches a wallet's native TON balance (in nanotons) from the chain's
 * configured JSON-RPC endpoint. TON launches with native $TON only, so this
 * does not handle Jettons.
 */
export default (
  address?: string,
  rpcUrl?: string,
  queryOptions?: Partial<QueryOptions>
) => {
  const queryKey = ['useTonBalance', address, rpcUrl]

  const response = (useQuery as QueryType)({
    queryKey,
    queryFn: async () => {
      if (!address || !rpcUrl) {
        return undefined
      }

      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'getAddressBalance',
          params: { address }
        })
      })
      const data = await res.json()

      if (data.ok === false || data.error) {
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
    enabled: address !== undefined && rpcUrl !== undefined,
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
