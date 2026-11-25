import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'
import {
  setParams,
  type paths,
  MAINNET_RELAY_API
} from '@relayprotocol/relay-sdk'
import fetcher from '../fetcher.js'

export type TrendingCurrenciesQuery =
  paths['/currencies/trending']['get']['parameters']['query'] & {
    referrer?: string
  }

export type TrendingCurrenciesResponse =
  paths['/currencies/trending']['get']['responses']['200']['content']['application/json']

type QueryType = typeof useQuery<
  TrendingCurrenciesResponse,
  DefaultError,
  TrendingCurrenciesResponse,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

export const queryTrendingCurrencies = function (
  baseApiUrl: string = MAINNET_RELAY_API,
  options?: TrendingCurrenciesQuery,
  headers?: Record<string, string>
): Promise<TrendingCurrenciesResponse> {
  const url = new URL(`${baseApiUrl}/currencies/trending`)
  setParams(url, options ?? {})
  return fetcher(url.href, headers)
}

export default (
  baseApiUrl?: string,
  queryParams?: TrendingCurrenciesQuery,
  queryOptions?: Partial<QueryOptions>
) => {
  const queryKey = ['useTrendingCurrencies', baseApiUrl, queryParams]

  const response = (useQuery as QueryType)({
    queryKey: queryKey,
    queryFn: () => queryTrendingCurrencies(baseApiUrl, queryParams),
    ...queryOptions,
    enabled: queryOptions?.enabled
  })

  return response
}
