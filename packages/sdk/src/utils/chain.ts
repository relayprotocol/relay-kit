import { zeroAddress, type Chain } from 'viem'
import type { RelayChain, paths } from '../types/index.js'
import { ASSETS_RELAY_API } from '../constants/servers.js'

export type RelayAPIChain = Required<
  NonNullable<
    paths['/chains']['get']['responses']['200']['content']['application/json']['chains']
  >['0']
>

export const convertViemChainToRelayChain = (
  chain: Chain
): RelayChain & Required<Pick<RelayChain, 'viemChain'>> => {
  return {
    id: chain.id,
    name: chain.name.replace(' ', '-'),
    displayName: chain.name,
    httpRpcUrl:
      chain.rpcUrls.default && chain.rpcUrls.default && chain.rpcUrls.default
        ? (chain.rpcUrls.default.http[0] ?? '')
        : '',
    wsRpcUrl:
      chain.rpcUrls && chain.rpcUrls.default.webSocket
        ? (chain.rpcUrls.default.webSocket[0] ?? '')
        : '',
    icon: {
      dark: `${ASSETS_RELAY_API}/icons/${chain.id}/dark.png`,
      light: `${ASSETS_RELAY_API}/icons/${chain.id}/light.png`,
      squaredDark: `${ASSETS_RELAY_API}/icons/square/${chain.id}/dark.png`,
      squaredLight: `${ASSETS_RELAY_API}/icons/square/${chain.id}/light.png`
    },
    currency: {
      address: zeroAddress,
      ...chain.nativeCurrency
    },
    explorerUrl: chain.blockExplorers?.default.url ?? '',
    vmType: 'evm',
    depositEnabled: true,
    viemChain: chain
  }
}
