import { MAINNET_RELAY_API, setParams, type paths } from '@relayprotocol/relay-sdk'
import fetcher from '../fetcher.js'
import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'

type SwapSourcesQuery = paths['/swap-sources']['get']['parameters']['query']

export type SwapSourcesResponse =
  paths['/swap-sources']['get']['responses']['200']['content']['application/json']

type QueryType = typeof useQuery<
  SwapSourcesResponse,
  DefaultError,
  SwapSourcesResponse,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

export const querySwapSources = function (
  baseApiUrl: string = MAINNET_RELAY_API,
  options?: SwapSourcesQuery,
  headers?: HeadersInit
): Promise<SwapSourcesResponse> {
  const url = new URL(`${baseApiUrl}/swap-sources`)
  setParams(url, options ?? {})
  return fetcher(url.href, headers)
}

export default function (
  baseApiUrl?: string,
  options?: SwapSourcesQuery,
  queryOptions?: Partial<QueryOptions>
) {
  return (useQuery as QueryType)({
    queryKey: ['useSwapSources', baseApiUrl, options],
    queryFn: () => querySwapSources(baseApiUrl, options),
    retry: false,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...queryOptions
  })
}
