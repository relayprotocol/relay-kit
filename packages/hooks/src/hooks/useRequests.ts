import {
  MAINNET_RELAY_API,
  type paths,
  setParams
} from '@relayprotocol/relay-sdk'
import { useMemo } from 'react'
import {
  useInfiniteQuery,
  type DefaultError,
  type InfiniteData,
  type QueryKey
} from '@tanstack/react-query'
import fetcher from '../fetcher.js'

export type UserTransactionQuery =
  paths['/requests/v3']['get']['parameters']['query']

export type UserTransactionsResponse =
  paths['/requests/v3']['get']['responses']['200']['content']['application/json']

type InfiniteQueryType = typeof useInfiniteQuery<
  UserTransactionsResponse,
  DefaultError,
  InfiniteData<UserTransactionsResponse>,
  QueryKey,
  string | undefined | null
>
type QueryOptions = Parameters<InfiniteQueryType>['0']

// NOTE: GET /requests/v3 requires a Relay API key (x-api-key). These hooks run
// client-side, so the key is NOT sent from here — point `baseApiUrl` at a proxy
// that injects the `x-api-key` header server-side. See the package README.
export const queryRequests = function (
  baseApiUrl: string = MAINNET_RELAY_API,
  options?: UserTransactionQuery | false,
  pageParam?: string | null,
  headers?: HeadersInit
): Promise<UserTransactionsResponse> {
  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : undefined
  const url = new URL(`${baseApiUrl}/requests/v3`, baseUrl)

  let query: UserTransactionQuery = { ...options }

  if (pageParam) {
    query.continuation = pageParam
  }

  setParams(url, query)
  return fetcher(url.href, headers)
}

export default function (
  options?: UserTransactionQuery | false,
  baseApiUrl?: string,
  queryOptions?: Partial<QueryOptions>
) {
  const response = (useInfiniteQuery as InfiniteQueryType)({
    queryKey: ['useUserTransactions', options],
    enabled: options !== undefined,
    queryFn: (data) => queryRequests(baseApiUrl, options, data.pageParam),
    getNextPageParam: (data) => {
      return data.continuation
    },
    initialPageParam: null,
    retry: false,
    ...queryOptions
  })

  const transactions = useMemo(
    () => response.data?.pages?.flatMap((page) => page?.requests || []) ?? [],
    [response.data]
  )

  return {
    ...response,
    data: transactions
  }
}
