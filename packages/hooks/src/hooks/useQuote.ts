import {
  MAINNET_RELAY_API,
  RelayClient,
  type AdaptedWallet,
  type Execute,
  type paths,
  type ProgressData
} from '@relayprotocol/relay-sdk'
import { axiosPostFetcher } from '../fetcher.js'
import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { WalletClient } from 'viem'
import type { AxiosRequestConfig } from 'axios'

type QuoteBody =
  paths['/quote']['post']['requestBody']['content']['application/json']

export type QuoteResponse =
  paths['/quote']['post']['responses']['200']['content']['application/json']

type QueryType = typeof useQuery<
  QuoteResponse,
  DefaultError,
  QuoteResponse,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

export const queryQuote = function (
  baseApiUrl: string = MAINNET_RELAY_API,
  options?: QuoteBody,
  config?: AxiosRequestConfig
): Promise<QuoteResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseApiUrl}/quote`)
    axiosPostFetcher(url.href, options, config)
      .then((response) => {
        const request: AxiosRequestConfig = {
          url: url.href,
          method: 'post',
          data: options
        }
        resolve({
          ...response,
          request
        })
      })
      .catch((e) => {
        reject(e)
      })
  })
}

export type onProgress = (data: ProgressData) => void

export default function (
  client?: RelayClient,
  wallet?: WalletClient | AdaptedWallet,
  options?: QuoteBody,
  onRequest?: (options?: QuoteBody, config?: AxiosRequestConfig) => void,
  onResponse?: (data: QuoteResponse, options?: QuoteBody) => void,
  queryOptions?: Partial<QueryOptions>,
  onError?: (e: any) => void,
  config?: AxiosRequestConfig,
  baseApiUrl?: string
) {
  const queryKey = ['useQuote', options]
  const response = (useQuery as QueryType)({
    queryKey: queryKey,
    queryFn: () => {
      onRequest?.(options, config)
      if (options && client?.source && !options.referrer) {
        options.referrer = client.source
      }
      const promise = queryQuote(baseApiUrl ?? client?.baseApiUrl, options, {
        ...config,
        headers: {
          'relay-sdk-version': client?.version ?? 'unknown',
          'relay-kit-ui-version': client?.uiVersion ?? 'unknown'
        }
      })
      promise
        .then((response: any) => {
          onResponse?.(response, options)
        })
        .catch((e) => {
          if (onError) {
            onError?.(e)
          } else {
            throw e
          }
        })
      return promise
    },
    enabled: client !== undefined && options !== undefined,
    retry: false,
    ...queryOptions
  })

  const executeQuote = useCallback(
    (onProgress: onProgress) => {
      if (!wallet) {
        throw 'Missing a valid wallet'
      }

      if (!response.data) {
        throw 'Missing a quote'
      }

      const promise = client?.actions?.execute({
        wallet,
        quote: response.data as Execute,
        onProgress
      })

      return promise
    },
    [response.data, wallet, client]
  )

  return useMemo(
    () =>
      ({
        ...response,
        data: response.error ? undefined : response.data,
        queryKey,
        executeQuote
      }) as Omit<ReturnType<QueryType>, 'data'> & {
        data?: QuoteResponse
        queryKey: QueryKey
        executeQuote: (
          onProgress: onProgress
        ) =>
          | Promise<{ data: Execute; abortController?: AbortController }>
          | undefined
      },
    [
      response.data,
      response.error,
      response.isLoading,
      response.isFetching,
      response.isRefetching,
      response.dataUpdatedAt,
      executeQuote,
      queryKey
    ]
  )
}
