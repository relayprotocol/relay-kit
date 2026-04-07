import { useContext } from 'react'
import { useRelayChains } from '@relayprotocol/relay-kit-hooks'
import { useRelayClient } from './index.js'
import { ProviderOptionsContext } from '../providers/RelayKitProvider.js'

const DEFAULT_CACHE_OPTIONS = {
  staleTime: 1000 * 60 * 5, // 5 minutes
  gcTime: 1000 * 60 * 5,
  refetchOnMount: false,
  refetchOnWindowFocus: false
} as const

export const useInternalRelayChains = () => {
  const relayClient = useRelayClient()
  const providerOptions = useContext(ProviderOptionsContext)

  return useRelayChains(
    relayClient?.baseApiUrl,
    {
      includeChains: providerOptions.privateChainIds?.join(','),
      referrer: relayClient?.source
    },
    DEFAULT_CACHE_OPTIONS
  )
}
