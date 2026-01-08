import {
  convertViemChainToRelayChain,
  MAINNET_RELAY_API,
  setParams,
  type paths
} from '@relayprotocol/relay-sdk'
import { configureViemChain } from '@relayprotocol/relay-sdk/chain-utils'
import fetcher from '../fetcher.js'
import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'
import { useMemo } from 'react'
import { mainnet } from 'viem/chains'

type ChainsQuery = paths['/chains']['get']['parameters']['query'] & {
  referrer?: string
}

export type ChainsResponse =
  paths['/chains']['get']['responses']['200']['content']['application/json']

type QueryType = typeof useQuery<
  ChainsResponse,
  DefaultError,
  ChainsResponse,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

export const queryRelayChains = function (
  baseApiUrl: string = MAINNET_RELAY_API,
  options?: ChainsQuery,
  headers?: HeadersInit
): Promise<ChainsResponse> {
  const url = new URL(`${baseApiUrl}/chains`)
  setParams(url, options ?? {})
  return fetcher(url.href, headers)
}

export default function (
  baseApiUrl?: string,
  options?: ChainsQuery,
  queryOptions?: Partial<QueryOptions>
) {
  const response = (useQuery as QueryType)({
    queryKey: ['useRelayChains', baseApiUrl, options],
    queryFn: () => queryRelayChains(baseApiUrl, options),
    retry: false,
    ...queryOptions
  })

  type ConfiguredViemChain = ReturnType<typeof configureViemChain>

  return useMemo(() => {
    const chains: ConfiguredViemChain[] | undefined =
      response?.data?.chains?.map((chain: any) => configureViemChain(chain))
    return {
      ...response,
      viemChains: chains?.map((chain) => chain.viemChain),
      chains: chains ? chains : [convertViemChainToRelayChain(mainnet)]
    } as ReturnType<QueryType> & {
      viemChains?: ConfiguredViemChain['viemChain'][]
      chains?: ConfiguredViemChain[]
    }
  }, [response.data, response.data?.chains, response.error, response.isLoading])
}
