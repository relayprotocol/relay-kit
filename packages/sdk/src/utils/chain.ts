import { zeroAddress, type Chain } from 'viem'
import type { RelayChain, paths } from '../types/index.js'
import * as viemChains from 'viem/chains'
import { ASSETS_RELAY_API } from '../constants/servers.js'

type RelayAPIChain = Required<
  NonNullable<
    paths['/chains']['get']['responses']['200']['content']['application/json']['chains']
  >['0']
>

const viemChainMap = Object.values(viemChains).reduce(
  (chains, chain) => {
    chains[chain.id] = chain
    return chains
  },
  {} as Record<number, Chain>
)

export const configureViemChain = (
  chain: RelayAPIChain
): RelayChain & Required<Pick<RelayChain, 'viemChain'>> => {
  let viemChain: Chain

  const overriddenChains = [999, 1337]
  const staticChain = overriddenChains.includes(chain.id)
    ? undefined
    : viemChainMap[chain.id]
  if (staticChain) {
    if (staticChain.id === 8453) {
      viemChain = viemChains.basePreconf
    } else {
      viemChain = staticChain
    }
  } else {
    viemChain = {
      id: chain.id,
      name: chain.displayName,
      nativeCurrency: {
        name: chain.currency.name ?? 'Ethereum',
        decimals: chain.currency.decimals ?? 18,
        symbol: chain.currency.symbol ?? 'ETH'
      },
      rpcUrls: {
        default: {
          http: [chain.httpRpcUrl],
          webSocket: [chain.wsRpcUrl]
        },
        public: {
          http: [chain.httpRpcUrl],
          webSocket: [chain.wsRpcUrl]
        }
      },
      blockExplorers: {
        etherscan: {
          name: chain.explorerName,
          url: chain.explorerUrl
        },
        default: {
          name: chain.explorerName,
          url: chain.explorerUrl
        }
      }
    } as const satisfies Chain
  }

  return {
    ...chain,
    viemChain,
    icon: {
      dark: `${ASSETS_RELAY_API}/icons/${chain.id}/dark.png`,
      light: chain.iconUrl ?? `${ASSETS_RELAY_API}/icons/${chain.id}/light.png`,
      squaredDark: `${ASSETS_RELAY_API}/icons/square/${chain.id}/dark.png`,
      squaredLight: `${ASSETS_RELAY_API}/icons/square/${chain.id}/light.png`
    }
  }
}

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
