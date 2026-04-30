import {
  MAINNET_RELAY_API,
  setParams,
  type paths
} from '@relayprotocol/relay-sdk'
import fetcher from '../fetcher.js'
import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'
import { useMemo } from 'react'

type TokenPriceQuery =
  paths['/currencies/token/price']['get']['parameters']['query'] & {
    referrer?: string
  }

export type TokenPriceResponse =
  paths['/currencies/token/price']['get']['responses']['200']['content']['application/json']

type QueryType = typeof useQuery<
  TokenPriceResponse,
  DefaultError,
  TokenPriceResponse,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

export const queryTokenPrice = function (
  baseApiUrl: string = MAINNET_RELAY_API,
  options?: TokenPriceQuery,
  headers?: HeadersInit
): Promise<TokenPriceResponse> {
  const url = new URL(`${baseApiUrl}/currencies/token/price`)
  setParams(url, options ?? {})
  return fetcher(url.href, headers)
}

export default function (
  baseApiUrl?: string,
  options?: TokenPriceQuery,
  queryOptions?: Partial<QueryOptions>
) {
  const response = (useQuery as QueryType)({
    queryKey: ['useTokenPrice', options],
    queryFn: () => queryTokenPrice(baseApiUrl, options),
    retry: false,
    staleTime: 60_000,
    ...queryOptions
  })

  return useMemo(() => {
    return {
      ...response
    } as ReturnType<QueryType>
  }, [response.data, response.error, response.isLoading])
}
