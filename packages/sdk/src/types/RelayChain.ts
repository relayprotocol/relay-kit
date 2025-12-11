import type { Chain } from 'viem'
import type { paths } from '../types/index.js'

type RelayAPIChain = NonNullable<
  paths['/chains']['get']['responses']['200']['content']['application/json']['chains']
>['0']

export type ChainVM =
  | 'evm'
  | 'svm'
  | 'bvm'
  | 'tvm'
  | 'suivm'
  | 'hypevm'
  | 'lvm'
  | 'tonvm'

export type RelayChain = {
  id: number
  name: string
  displayName: string
  httpRpcUrl?: string
  wsRpcUrl?: string
  explorerUrl?: string
  explorerQueryParams?: {
    [key: string]: unknown
  } | null
  explorerPaths?: {
    transaction?: string
  } | null
  icon?: {
    dark?: string
    light?: string
    squaredDark?: string
    squaredLight?: string
  }
  currency?: {
    id?: string
    symbol?: string
    name?: string
    address?: string
    decimals?: number
    supportsBridging?: boolean
  }
  depositEnabled?: boolean
  blockProductionLagging?: boolean
  erc20Currencies?: RelayAPIChain['erc20Currencies']
  featuredTokens?: RelayAPIChain['featuredTokens']
  tags?: RelayAPIChain['tags']
  iconUrl?: string | null
  logoUrl?: string | null
  brandColor?: string | null
  vmType?: ChainVM
  viemChain?: Chain
  baseChainId?: number | null
  tokenSupport?: 'All' | 'Limited'
  protocol?: RelayAPIChain['protocol']
}
