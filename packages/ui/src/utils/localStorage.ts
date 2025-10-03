import type { Token } from '../types'
import {
  RELAY_UI_KIT_KEY,
  DEFAULT_CACHE_TTL_MINUTES
} from '../constants/cache.js'

interface CacheEntry {
  value: string
  expiresAt: number
}

interface RelayUiKitData {
  acceptedUnverifiedTokens: string[]
  recentCustomAddresses?: string[]
  starredChainIds?: number[]
  genericCache?: { [key: string]: CacheEntry }
}

export function getRelayUiKitData(): RelayUiKitData {
  if (typeof window === 'undefined')
    return {
      acceptedUnverifiedTokens: [],
      recentCustomAddresses: [],
      starredChainIds: [],
      genericCache: {}
    }

  let data: RelayUiKitData = {
    acceptedUnverifiedTokens: [],
    recentCustomAddresses: [],
    starredChainIds: [],
    genericCache: {}
  }
  try {
    const localStorageData = localStorage.getItem(RELAY_UI_KIT_KEY)
    data = localStorageData ? JSON.parse(localStorageData) : data
    // Ensure all fields exist if loaded data doesn't have them
    if (!data.genericCache) {
      data.genericCache = {}
    }
    if (!data.recentCustomAddresses) {
      data.recentCustomAddresses = []
    }
    if (!data.starredChainIds) {
      data.starredChainIds = []
    }
  } catch (e) {
    console.warn('Failed to get RelayKitUIData', e)
  }
  return data
}

export function setRelayUiKitData(newData: Partial<RelayUiKitData>): void {
  if (typeof window === 'undefined') return

  const currentData = getRelayUiKitData()
  // Deep merge generic cache if both exist
  const updatedGenericCache = {
    ...(currentData.genericCache || {}),
    ...(newData.genericCache || {})
  }
  const updatedData = {
    ...currentData,
    ...newData,
    genericCache: updatedGenericCache
  }
  try {
    // Clean expired entries before saving
    if (updatedData.genericCache) {
      const now = Date.now()
      Object.keys(updatedData.genericCache).forEach((key) => {
        if (updatedData.genericCache![key].expiresAt <= now) {
          delete updatedData.genericCache![key]
        }
      })
    }
    localStorage.setItem(RELAY_UI_KIT_KEY, JSON.stringify(updatedData))
  } catch (e) {
    console.warn('Failed to update RelayKitUIData', e)
  }
}

/**
 * Get a value from the generic cache.
 * @param key - The unique key for the cache entry.
 * @returns The cached value (as string), or null if it doesn't exist or is expired.
 */
export function getCacheEntry(key: string): string | null {
  const data = getRelayUiKitData()
  const cache = data.genericCache?.[key]

  if (cache && cache.expiresAt > Date.now()) {
    return cache.value
  } else if (cache) {
    // Optional: Clean up the specific expired entry immediately
    const currentCache = data.genericCache || {}
    delete currentCache[key]
    setRelayUiKitData({ genericCache: currentCache })
  }
  return null
}

/**
 * Set a value in the generic cache.
 * @param key - The unique key for the cache entry.
 * @param value - The value to set (will be converted to string).
 * @param ttlMinutes - The time to live for the cache entry in minutes.
 */
export function setCacheEntry(
  key: string,
  value: bigint | string | number, // Allow various types that can be stringified
  ttlMinutes: number = DEFAULT_CACHE_TTL_MINUTES
): void {
  const data = getRelayUiKitData()
  const newCache = data.genericCache || {}
  newCache[key] = {
    value: value.toString(),
    expiresAt: Date.now() + ttlMinutes * 60 * 1000
  }
  setRelayUiKitData({ genericCache: newCache })
}

export const alreadyAcceptedToken = (token: Token) => {
  const tokenKey = `${token.chainId}:${token.address}`
  const relayUiKitData = getRelayUiKitData()
  // Ensure acceptedUnverifiedTokens exists before accessing includes
  return relayUiKitData.acceptedUnverifiedTokens?.includes(tokenKey) ?? false
}

/**
 * Add a custom address to the saved list if it doesn't already exist
 * Keeps a maximum of 3 addresses, removing the oldest when limit is exceeded
 * @param address - The address to save
 */
export function addCustomAddress(address: string): void {
  const data = getRelayUiKitData()
  const recentCustomAddresses = data.recentCustomAddresses || []

  // Remove address if it already exists to avoid duplicates
  const filteredAddresses = recentCustomAddresses.filter(
    (addr) => addr !== address
  )

  // Add the new address to the end
  const updatedAddresses = [...filteredAddresses, address]

  // Keep only the last 3 addresses (most recent)
  const limitedAddresses = updatedAddresses.slice(-3)

  setRelayUiKitData({ recentCustomAddresses: limitedAddresses })
}

/**
 * Get all saved custom addresses
 * @returns Array of custom addresses
 */
export function getCustomAddresses(): string[] {
  const data = getRelayUiKitData()
  return data.recentCustomAddresses || []
}

/**
 * Remove a custom address from the saved list
 * @param address - The address to remove
 */
export function removeCustomAddress(address: string): void {
  const data = getRelayUiKitData()
  const recentCustomAddresses = data.recentCustomAddresses || []
  const updatedAddresses = recentCustomAddresses.filter(
    (addr) => addr !== address
  )
  setRelayUiKitData({ recentCustomAddresses: updatedAddresses })
}

/**
 * Get starred chain IDs from localStorage
 * @returns Array of starred chain IDs, or undefined if never set
 */
export function getStarredChainIds(): number[] | undefined {
  const data = getRelayUiKitData()
  return data.starredChainIds
}

/**
 * Add a chain ID to the starred chains list
 * @param chainId - The chain ID to star
 */
export function addStarredChain(chainId: number): void {
  const data = getRelayUiKitData()
  const starredChainIds = data.starredChainIds || []

  if (!starredChainIds.includes(chainId)) {
    const updatedStarredChainIds = [...starredChainIds, chainId]
    setRelayUiKitData({ starredChainIds: updatedStarredChainIds })
  }
}

/**
 * Remove a chain ID from the starred chains list
 * @param chainId - The chain ID to unstar
 */
export function removeStarredChain(chainId: number): void {
  const data = getRelayUiKitData()
  const starredChainIds = data.starredChainIds || []
  const updatedStarredChainIds = starredChainIds.filter((id) => id !== chainId)
  setRelayUiKitData({ starredChainIds: updatedStarredChainIds })
}

/**
 * Check if a chain ID is starred
 * @param chainId - The chain ID to check
 * @returns True if the chain is starred
 */
export function isChainStarred(chainId: number): boolean {
  const starredChainIds = getStarredChainIds()
  return starredChainIds ? starredChainIds.includes(chainId) : false
}

/**
 * Toggle starred status of a chain
 * @param chainId - The chain ID to toggle
 */
export function toggleStarredChain(chainId: number): void {
  if (isChainStarred(chainId)) {
    removeStarredChain(chainId)
  } else {
    addStarredChain(chainId)
  }
}
