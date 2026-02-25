import {
  MAINNET_RELAY_API,
  RelayClient,
  setParams,
  type Execute,
  type paths,
  type ProgressData
} from '@relayprotocol/relay-sdk'
import fetcher from '../fetcher.js'
import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'
import { useMemo } from 'react'
import type { AxiosRequestConfig } from 'axios'

type ExecutionStatusParams =
  paths['/intents/status/v2']['get']['parameters']['query'] & {
    referrer?: string
  }

export type ExecutionStatusResponse =
  paths['/intents/status/v2']['get']['responses']['200']['content']['application/json']

type QueryType = typeof useQuery<
  ExecutionStatusResponse,
  DefaultError,
  ExecutionStatusResponse,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

export const queryExecutionStatus = function (
  baseApiUrl: string = MAINNET_RELAY_API,
  options?: ExecutionStatusParams,
  headers?: HeadersInit
): Promise<ExecutionStatusResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseApiUrl}/intents/status/v2`)
    let query: ExecutionStatusParams = { ...options }
    setParams(url, query)

    fetcher(url.href, headers)
      .then((response) => {
        const request: AxiosRequestConfig = {
          url: url.href,
          method: 'get'
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
  options?: ExecutionStatusParams,
  onRequest?: () => void,
  onResponse?: (data: Execute) => void,
  queryOptions?: Partial<QueryOptions>
) {
  const queryKey = ['useExecutionStatus', options]
  const response = (useQuery as QueryType)({
    queryKey: queryKey,
    queryFn: () => {
      onRequest?.()
      const promise = queryExecutionStatus(client?.baseApiUrl, options)
      promise
        .then((response: any) => {
          onResponse?.(response)
        })
        .catch(() => {})
      return promise
    },
    enabled: client !== undefined && options !== undefined,
    retry: false,
    ...queryOptions
  })

  return useMemo(
    () =>
      ({
        ...response,
        data: response.error ? undefined : response.data,
        queryKey
      }) as Omit<ReturnType<QueryType>, 'data'> & {
        data?: ExecutionStatusResponse
        queryKey: QueryKey
      },
    [
      response.data,
      response.error,
      response.isLoading,
      response.isFetching,
      response.isRefetching,
      response.dataUpdatedAt,
      queryKey
    ]
  )
}
