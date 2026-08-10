import { axiosPostFetcher } from '../fetcher.js'
import { useMemo } from 'react'
import { MAINNET_RELAY_API, type paths } from '@relayprotocol/relay-sdk'
import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'

export type GetCurrenciesBody = NonNullable<
  paths['/currencies/v2']['post']['requestBody']
>['content']['application/json'] & { referrer?: string }
export type GetCurrenciesResponse =
  paths['/currencies/v2']['post']['responses']['200']['content']['application/json']
export type CurrencyList = GetCurrenciesResponse
export type Currency = GetCurrenciesResponse[0]
type QueryType = typeof useQuery<
  GetCurrenciesResponse,
  DefaultError,
  GetCurrenciesResponse,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

export const queryTokenList = function (
  baseApiUrl: string = MAINNET_RELAY_API,
  options?: GetCurrenciesBody,
  headers?: Record<string, string>
): Promise<GetCurrenciesResponse> {
  const url = new URL(`${baseApiUrl}/currencies/v2`)
  return axiosPostFetcher(url.href, options, headers)
}

export default function (
  baseApiUrl?: string,
  options?: GetCurrenciesBody,
  queryOptions?: Partial<QueryOptions>
) {
  const response = (useQuery as QueryType)({
    queryKey: ['useTokenList', options],
    queryFn: () => queryTokenList(baseApiUrl, options),
    enabled: options ? true : false,
    retry: false,
    ...queryOptions
  })

  return useMemo(() => {
    return {
      ...response,
      data: response.error ? undefined : response.data
    } as Omit<ReturnType<QueryType>, 'data'> & {
      data?: GetCurrenciesResponse
    }
  }, [response.data, response.error, response.isLoading, response.isFetching])
}
