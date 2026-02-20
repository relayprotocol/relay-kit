/**
 * localStorage helpers for persisting user preferences in relay-kit-ui-v2.
 *
 * IMPORTANT: The key "relay-ui-kit" is shared with @relayprotocol/relay-kit-ui
 * so that user preferences (starred chains, accepted tokens, etc.) persist
 * when an app upgrades from the v1 package to this one.
 */

const RELAY_UI_KIT_KEY = 'relay-ui-kit'

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

function getRelayUiKitData(): RelayUiKitData {
  if (typeof window === 'undefined') {
    return { acceptedUnverifiedTokens: [], recentCustomAddresses: [] }
  }

  let data: RelayUiKitData = {
    acceptedUnverifiedTokens: [],
    recentCustomAddresses: [],
    genericCache: {}
  }

  try {
    const raw = localStorage.getItem(RELAY_UI_KIT_KEY)
    data = raw ? JSON.parse(raw) : data
    if (!data.genericCache) data.genericCache = {}
    if (!data.recentCustomAddresses) data.recentCustomAddresses = []
  } catch (e) {
    console.warn('[relay-kit-ui-v2] Failed to read localStorage', e)
  }

  return data
}

function setRelayUiKitData(newData: Partial<RelayUiKitData>): void {
  if (typeof window === 'undefined') return

  const currentData = getRelayUiKitData()
  const updatedGenericCache = {
    ...(currentData.genericCache ?? {}),
    ...(newData.genericCache ?? {})
  }

  const updatedData: RelayUiKitData = {
    ...currentData,
    ...newData,
    genericCache: updatedGenericCache
  }

  try {
    // Prune expired cache entries before writing
    if (updatedData.genericCache) {
      const now = Date.now()
      for (const key of Object.keys(updatedData.genericCache)) {
        if ((updatedData.genericCache[key]?.expiresAt ?? 0) <= now) {
          delete updatedData.genericCache[key]
        }
      }
    }
    localStorage.setItem(RELAY_UI_KIT_KEY, JSON.stringify(updatedData))
  } catch (e) {
    console.warn('[relay-kit-ui-v2] Failed to write localStorage', e)
  }
}

/**
 * Default starred chain IDs shown to new users who haven't configured starred chains yet.
 * Ethereum, Arbitrum, Base, Solana.
 */
const DEFAULT_STARRED_CHAIN_IDS = [1, 42161, 8453, 792703809]

/**
 * Returns the list of starred chain IDs.
 * Returns the default popular chains when the user has never configured starred chains.
 * Returns an empty array if the user has explicitly cleared all starred chains.
 */
export function getStarredChainIds(): number[] {
  const data = getRelayUiKitData()
  // undefined = never configured → return defaults; [] = user cleared all → return empty
  return data.starredChainIds ?? DEFAULT_STARRED_CHAIN_IDS
}

/**
 * Returns true if the given chain is in the user's starred list.
 */
export function isChainStarred(chainId: number): boolean {
  const ids = getStarredChainIds()
  return ids ? ids.includes(chainId) : false
}

/**
 * Toggles the starred state of a chain, persisting the change to localStorage.
 * Uses getStarredChainIds() so defaults are preserved on first interaction.
 */
export function toggleStarredChain(chainId: number): void {
  // Use getStarredChainIds() so the defaults are seeded on first interaction
  const current = getStarredChainIds()
  if (isChainStarred(chainId)) {
    setRelayUiKitData({ starredChainIds: current.filter((id) => id !== chainId) })
  } else {
    setRelayUiKitData({ starredChainIds: [...current, chainId] })
  }
}

/**
 * Returns true if the token at the given address+chainId has been accepted
 * by the user as an unverified token.
 */
export function alreadyAcceptedToken(token: {
  chainId: number
  address: string
}): boolean {
  const key = `${token.chainId}:${token.address}`
  const data = getRelayUiKitData()
  return data.acceptedUnverifiedTokens?.includes(key) ?? false
}

/**
 * Stores the user's acceptance of an unverified token so they aren't prompted
 * again on subsequent selections.
 */
export function acceptUnverifiedToken(token: {
  chainId: number
  address: string
}): void {
  const key = `${token.chainId}:${token.address}`
  const data = getRelayUiKitData()
  const existing = data.acceptedUnverifiedTokens ?? []
  if (!existing.includes(key)) {
    setRelayUiKitData({ acceptedUnverifiedTokens: [...existing, key] })
  }
}

const MAX_RECENT_ADDRESSES = 5

/**
 * Adds an address to the recent custom addresses list (max 5, most recent first).
 */
export function addCustomAddress(address: string): void {
  const data = getRelayUiKitData()
  const existing = data.recentCustomAddresses ?? []
  // Remove duplicates then prepend
  const updated = [address, ...existing.filter((a) => a !== address)].slice(
    0,
    MAX_RECENT_ADDRESSES
  )
  setRelayUiKitData({ recentCustomAddresses: updated })
}

/**
 * Returns the list of recently used custom addresses, most recent first.
 */
export function getCustomAddresses(): string[] {
  return getRelayUiKitData().recentCustomAddresses ?? []
}
