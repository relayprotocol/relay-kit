import { useMemo } from 'react'
import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'
import { MAINNET_RELAY_API } from '@relayprotocol/relay-sdk'
import { queryRequests } from './useRequests.js'

export type DepositAddressStatusResponse = {
  status?: 'refund' | 'waiting' | 'failure' | 'pending' | 'success'
  details?: string
  txHashes?: string[]
  inTxHashes?: string[]
}

type QueryType = typeof useQuery<
  DepositAddressStatusResponse | undefined,
  DefaultError,
  DepositAddressStatusResponse | undefined,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

type DepositAddressStatusParams = {
  depositAddress: string
}

export const queryDepositAddressStatus = async function (
  baseApiUrl: string = MAINNET_RELAY_API,
  options?: DepositAddressStatusParams
): Promise<DepositAddressStatusResponse | undefined> {
  if (!options?.depositAddress) {
    return undefined
  }

  const response = await queryRequests(baseApiUrl, {
    user: options.depositAddress
  })

  const request = response?.requests?.[0]
  if (!request) {
    return undefined
  }

  return {
    status: request.status,
    details: request.data?.failReason,
    txHashes: request.data?.outTxs
      ?.map((tx) => tx.hash)
      .filter((hash): hash is string => Boolean(hash)),
    inTxHashes: request.data?.inTxs
      ?.map((tx) => tx.hash)
      .filter((hash): hash is string => Boolean(hash))
  }
}

export default function useDepositAddressStatus(
  options?: DepositAddressStatusParams,
  baseApiUrl?: string,
  queryOptions?: Partial<QueryOptions>
) {
  const response = (useQuery as QueryType)({
    queryKey: ['useDepositAddressStatus', options?.depositAddress],
    queryFn: () => queryDepositAddressStatus(baseApiUrl, options),
    enabled: options?.depositAddress !== undefined,
    retry: false,
    ...queryOptions
  })

  return useMemo(
    () =>
      ({
        ...response,
        data: response.error ? undefined : response.data,
        queryKey: ['useDepositAddressStatus', options?.depositAddress]
      }) as Omit<ReturnType<QueryType>, 'data'> & {
        data?: DepositAddressStatusResponse
        queryKey: QueryKey
      },
    [
      response.data,
      response.error,
      response.isLoading,
      response.isFetching,
      response.isRefetching,
      response.dataUpdatedAt,
      options?.depositAddress
    ]
  )
}
