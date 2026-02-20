import { useCallback, useState } from 'react'
import {
  getStarredChainIds,
  isChainStarred,
  toggleStarredChain
} from '@/lib/localStorage.js'
import { EventNames } from '@/constants/events.js'

/**
 * Manages user's starred chain preferences with localStorage persistence.
 * Returns reactive state that updates immediately on toggle.
 *
 * The storage key is shared with relay-kit-ui v1 so preferences carry over
 * if an app upgrades from the old package to this one.
 *
 * @example
 * const { isStarred, toggleStar } = useStarredChains()
 * // In a chain row:
 * <button onClick={() => toggleStar(chain.id, onAnalyticEvent)}>
 *   <Star className={isStarred(chain.id) ? 'fill-yellow-400' : ''} />
 * </button>
 */
export function useStarredChains(): {
  /** The current list of starred chain IDs (reactive) */
  starredChainIds: number[]
  /** Returns true if the given chain ID is starred */
  isStarred: (chainId: number) => boolean
  /**
   * Toggles the starred state of a chain and fires the appropriate analytics event.
   * @param chainId - Chain ID to toggle
   * @param chainName - Optional display name for analytics data
   * @param onAnalyticEvent - Optional analytics callback
   */
  toggleStar: (
    chainId: number,
    chainName?: string,
    onAnalyticEvent?: (name: string, data?: Record<string, unknown>) => void
  ) => void
} {
  // Use a counter to force re-renders when localStorage changes
  const [, forceUpdate] = useState(0)

  const starredChainIds = getStarredChainIds()

  const isStarredFn = useCallback((chainId: number): boolean => {
    return isChainStarred(chainId)
  }, [])

  const toggleStar = useCallback(
    (
      chainId: number,
      chainName?: string,
      onAnalyticEvent?: (name: string, data?: Record<string, unknown>) => void
    ) => {
      const wasStarred = isChainStarred(chainId)
      toggleStarredChain(chainId)

      // Analytics: fire the correct event based on new state
      const eventName = wasStarred ? EventNames.CHAIN_UNSTARRED : EventNames.CHAIN_STARRED
      onAnalyticEvent?.(eventName, { chainId, chainName })

      // Force re-render so the UI reflects the new starred state
      forceUpdate((n) => n + 1)
    },
    []
  )

  return {
    starredChainIds,
    isStarred: isStarredFn,
    toggleStar
  }
}
