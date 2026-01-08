import { type Chain } from 'viem'
import * as viemChains from 'viem/chains'
import type { RelayChain, paths } from '../types/index.js'
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
    viemChain = staticChain
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
