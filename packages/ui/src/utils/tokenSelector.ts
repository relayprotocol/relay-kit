import type { RelayChain } from '@relayprotocol/relay-sdk'
import type { Token } from '../types/index.js'
import { getStarredChainIds, setRelayUiKitData } from './localStorage.js'

export const isChainLocked = (
  chainId: number | undefined,
  lockChainId: number | undefined,
  otherTokenChainId: number | undefined,
  lockToken: boolean
) => {
  if (lockToken) {
    return true
  }
  if (lockChainId === undefined) return false

  // If this token is on the locked chain, only lock it if the other token isn't
  if (chainId === lockChainId) {
    return otherTokenChainId !== lockChainId || lockToken
  }

  return false
}

const POPULAR_CHAIN_IDS = new Set([1, 42161, 8453, 792703809]) // Ethereum, Arbitrum, Base, Solana

type ChainOption = RelayChain | { id: undefined; name: string }

type GroupedChains = {
  allChainsOption?: { id: undefined; name: string }
  starredChains: RelayChain[]
  alphabeticalChains: RelayChain[]
}

export const groupChains = (
  chains: ChainOption[],
  popularChainIds?: number[],
  currentStarredChainIds?: number[] | undefined
): GroupedChains => {
  // Get starred chains from localStorage or use provided ones
  let starredChainIds = currentStarredChainIds ?? getStarredChainIds()

  const allChainsOption = chains.find((chain) => chain.id === undefined) as
    | { id: undefined; name: string }
    | undefined
  const otherChains = chains.filter(
    (chain) => chain.id !== undefined
  ) as RelayChain[]

  let starredChains: RelayChain[]

  // If starredChainIds is undefined, use popular chains and set them
  if (starredChainIds === undefined) {
    const defaultStarredIds = popularChainIds || Array.from(POPULAR_CHAIN_IDS)
    // Filter to only include chains that actually exist in the chains array
    const availableChainIds = chains
      .filter((chain) => chain.id !== undefined)
      .map((chain) => (chain as RelayChain).id)
    const validStarredIds = defaultStarredIds.filter((id) =>
      availableChainIds.includes(id)
    )

    if (validStarredIds.length > 0) {
      // Set the popular chains as starred and return them
      setRelayUiKitData({ starredChainIds: validStarredIds })
      const priorityIds = new Set(validStarredIds)
      starredChains = otherChains
        .filter((chain) => chain.id && priorityIds.has(chain.id))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
    } else {
      // No valid popular chains found, return empty array
      starredChains = []
    }
  } else if (starredChainIds.length === 0) {
    // User has manually unstarred all chains, show empty starred section
    starredChains = []
  } else {
    // User has starred chains, show them
    const priorityIds = new Set(starredChainIds)
    starredChains = otherChains
      .filter((chain) => chain.id && priorityIds.has(chain.id))
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
  }

  return {
    allChainsOption,
    starredChains,
    alphabeticalChains: otherChains.sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    )
  }
}

export const sortChains = (chains: RelayChain[]) => {
  return chains.sort((a, b) => {
    // First sort by priority chains
    const aIsPriority = POPULAR_CHAIN_IDS.has(a.id)
    const bIsPriority = POPULAR_CHAIN_IDS.has(b.id)
    if (aIsPriority && !bIsPriority) return -1
    if (!aIsPriority && bIsPriority) return 1
    if (aIsPriority && bIsPriority) {
      return (
        Array.from(POPULAR_CHAIN_IDS).indexOf(a.id) -
        Array.from(POPULAR_CHAIN_IDS).indexOf(b.id)
      )
    }

    // Finally sort remaining chains alphabetically by displayName
    return a.displayName.localeCompare(b.displayName)
  })
}

export const getInitialChainFilter = (
  chainFilterOptions: RelayChain[],
  context: 'from' | 'to',
  depositAddressOnly: boolean,
  token?: Token,
  alwaysShowAllChains?: boolean
) => {
  const defaultFilter = { id: undefined, name: 'All Chains' }

  // If there is only one chain, return it
  if (chainFilterOptions.length === 1) {
    return chainFilterOptions[0]
  }

  if (depositAddressOnly) {
    if (token) {
      return (
        chainFilterOptions.find((chain) => chain.id === token.chainId) ||
        defaultFilter
      )
    }
    return chainFilterOptions[0]
  }

  if (alwaysShowAllChains) {
    return defaultFilter
  }

  if (token === undefined || context === 'from') {
    return defaultFilter
  }

  return (
    chainFilterOptions.find((chain) => chain.id === token.chainId) ||
    defaultFilter
  )
}
