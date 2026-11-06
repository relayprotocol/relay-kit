import { useQuery } from '@tanstack/react-query'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { getEnsAddress, normalize } from 'viem/ens'
import { usePublicClient } from 'wagmi'
import useRelayClient from './useRelayClient.js'

/**
 * Resolves an ENS name to an address on chain through the ENS Universal
 * Resolver. Reads through the app's wagmi transport for Ethereum mainnet,
 * falling back to the relay client's mainnet RPC when wagmi has no mainnet.
 * Never resolves through an RPC the app did not configure.
 */
export default function useENSAddress(name?: string) {
  const relayClient = useRelayClient()
  const wagmiClient = usePublicClient({ chainId: mainnet.id })
  const rpcUrl = relayClient?.chains.find(
    (chain) => chain.id === mainnet.id
  )?.httpRpcUrl

  return useQuery({
    queryKey: ['useENSAddress', wagmiClient?.uid ?? rpcUrl, name],
    queryFn: () =>
      getEnsAddress(
        wagmiClient ??
          createPublicClient({ chain: mainnet, transport: http(rpcUrl) }),
        {
          name: normalize(name!),
          universalResolverAddress:
            mainnet.contracts.ensUniversalResolver.address
        }
      ),
    enabled: Boolean(name && (wagmiClient || rpcUrl)),
    retry: false
  })
}
