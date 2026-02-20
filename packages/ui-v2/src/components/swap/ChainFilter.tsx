import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Star, Search, Info } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import { useStarredChains } from '@/hooks/useStarredChains.js'
import { useIsDarkMode } from '@/hooks/useIsDarkMode.js'
import { EventNames } from '@/constants/events.js'
import { AllChainsLogo } from './AllChainsLogo.js'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'

const ASSETS_RELAY_API = 'https://assets.relay.link'

/** Returns the light/dark square-format icon URL for a chain. */
function squareChainIcon(chain: RelayChain, mode: 'light' | 'dark'): string {
  return `${ASSETS_RELAY_API}/icons/square/${chain.id}/${mode}.png`
}

interface ChainFilterProps {
  /** All available chains to filter by */
  chains: RelayChain[]
  /** Currently selected chain filter (undefined = "all chains") */
  selectedChain?: RelayChain
  onSelectChain: (chain?: RelayChain) => void
  onAnalyticEvent?: (eventName: string, data?: Record<string, unknown>) => void
  /** Called when Tab is pressed from the last chain item — lets parent focus the token search */
  onTabOut?: () => void
  className?: string
}

/**
 * Chain sidebar filter for the token selector.
 * Shows "All Chains" → Starred chains → Chains A-Z.
 * Has its own internal search input to filter chains by name.
 *
 * Starring: right-click any chain row to open a context popover with Star/Unstar option.
 * A tooltip near the "Starred" section header explains the right-click gesture.
 *
 * Keyboard: ArrowUp/ArrowDown navigate within the list.
 * Tab from last item calls onTabOut so focus moves to token search.
 *
 * a11y: uses role="list" / role="listitem".
 * Starred chain state persists to localStorage via useStarredChains hook.
 */
export const ChainFilter: React.FC<ChainFilterProps> = ({
  chains,
  selectedChain,
  onSelectChain,
  onAnalyticEvent,
  onTabOut,
  className
}) => {
  const { starredChainIds, isStarred, toggleStar } = useStarredChains()
  const colorMode = useIsDarkMode()
  const [chainSearch, setChainSearch] = React.useState('')
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1)
  const [starMenuChainId, setStarMenuChainId] = React.useState<number | null>(null)
  const rowRefs = React.useRef<(HTMLButtonElement | null)[]>([])
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const startLongPress = (chainId: number) => {
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      setStarMenuChainId(chainId)
    }, 500)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Filter chains by internal search
  const filteredChains = React.useMemo(() => {
    if (!chainSearch) return chains
    const q = chainSearch.toLowerCase()
    return chains.filter((c) => c.displayName.toLowerCase().includes(q))
  }, [chains, chainSearch])

  // Group: starred first, then alphabetically sorted others
  // NOTE: starredChainIds is included in deps so this recomputes immediately after starring
  const { starredChains, otherChains } = React.useMemo(() => {
    const starred = filteredChains.filter((c) => isStarred(c.id))
    const others = filteredChains
      .filter((c) => !isStarred(c.id))
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
    return { starredChains: starred, otherChains: others }
  }, [filteredChains, isStarred, starredChainIds])

  // Flat ordered list for keyboard navigation (All + starred + others)
  const allRows = React.useMemo(
    () => ['all' as const, ...starredChains, ...otherChains],
    [starredChains, otherChains]
  )

  React.useEffect(() => {
    rowRefs.current = rowRefs.current.slice(0, allRows.length)
  }, [allRows.length])

  const handleSelectChain = (chain?: RelayChain) => {
    onAnalyticEvent?.(EventNames.CURRENCY_STEP_CHAIN_FILTER, {
      chain_id: chain?.id,
      chain_name: chain?.displayName
    })
    onSelectChain(chain)
  }

  const handleNavKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        const next = Math.min(index + 1, allRows.length - 1)
        setFocusedIndex(next)
        rowRefs.current[next]?.focus()
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const prev = Math.max(index - 1, 0)
        setFocusedIndex(prev)
        rowRefs.current[prev]?.focus()
        break
      }
      case 'Home': {
        e.preventDefault()
        setFocusedIndex(0)
        rowRefs.current[0]?.focus()
        break
      }
      case 'End': {
        e.preventDefault()
        const last = allRows.length - 1
        setFocusedIndex(last)
        rowRefs.current[last]?.focus()
        break
      }
      case 'Tab': {
        if (!e.shiftKey && index === allRows.length - 1 && onTabOut) {
          e.preventDefault()
          onTabOut()
        }
        break
      }
    }
  }

  const renderChainRow = (chain: RelayChain, rowIndex: number) => {
    const starred = isStarred(chain.id)
    const isSelected = selectedChain?.id === chain.id
    const isMenuOpen = starMenuChainId === chain.id

    return (
      <li key={chain.id} role="listitem">
        <PopoverPrimitive.Root
          open={isMenuOpen}
          onOpenChange={(o) => {
            // Only allow closing (not opening) via the standard trigger click;
            // opening is controlled exclusively via onContextMenu.
            if (!o) setStarMenuChainId(null)
          }}
        >
          <PopoverPrimitive.Trigger asChild>
            <button
              ref={(el) => { rowRefs.current[rowIndex] = el }}
              type="button"
              onClick={() => handleSelectChain(chain)}
              onContextMenu={(e) => {
                e.preventDefault()
                setStarMenuChainId(chain.id)
              }}
              onTouchStart={() => startLongPress(chain.id)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onTouchCancel={cancelLongPress}
              onKeyDown={(e) => handleNavKeyDown(e, rowIndex)}
              onFocus={() => setFocusedIndex(rowIndex)}
              aria-pressed={isSelected}
              tabIndex={focusedIndex === rowIndex || (focusedIndex === -1 && rowIndex === 0) ? 0 : -1}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-2 min-h-[40px]',
                'text-sm transition-colors duration-100',
                'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected && 'bg-accent font-medium text-foreground',
                !isSelected && 'text-muted-foreground'
              )}
            >
              <img
                src={squareChainIcon(chain, colorMode)}
                alt=""
                aria-hidden="true"
                className="h-5 w-5 rounded-sm object-cover bg-muted shrink-0"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <span className="truncate flex-1 text-left text-xs">{chain.displayName}</span>
              {starred && (
                <Star
                  className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400"
                  aria-label="Starred"
                />
              )}
            </button>
          </PopoverPrimitive.Trigger>

          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              side="right"
              align="center"
              sideOffset={4}
              onOpenAutoFocus={(e) => e.preventDefault()}
              className={cn(
                'z-50 rounded-lg border border-border bg-popover shadow-md p-1 min-w-[160px]',
                'focus:outline-none'
              )}
            >
              <button
                type="button"
                onClick={() => {
                  toggleStar(chain.id, chain.displayName, onAnalyticEvent)
                  setStarMenuChainId(null)
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors duration-100"
              >
                <Star
                  className={cn(
                    'h-3.5 w-3.5',
                    starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                  )}
                  aria-hidden="true"
                />
                {starred ? 'Unstar chain' : 'Star chain'}
              </button>
              <PopoverPrimitive.Arrow className="fill-border" />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </li>
    )
  }

  const starTooltip = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="How to star chains"
            className="text-muted-foreground hover:text-foreground focus:outline-none"
          >
            <Info className="h-3 w-3" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[180px] text-xs">
          Right-click or long-press any chain to star or unstar it
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  return (
    <nav
      aria-label="Filter by chain"
      className={cn('flex flex-col gap-1 min-h-0', className)}
    >
      {/* Chain search input */}
      <div className="relative shrink-0 pb-1">
        <Search
          className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          value={chainSearch}
          onChange={(e) => setChainSearch(e.target.value)}
          placeholder="Search"
          aria-label="Search chains"
          className={cn(
            'w-full rounded-md border border-border bg-muted/50',
            'pl-6 pr-2 py-1.5 text-xs',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'placeholder:text-muted-foreground'
          )}
        />
      </div>

      {/* Scrollable chain list */}
      <ul role="list" className="flex flex-col gap-0.5 overflow-y-auto overscroll-contain flex-1">
        {/* All Chains option */}
        <li role="listitem">
          <button
            ref={(el) => { rowRefs.current[0] = el }}
            type="button"
            onClick={() => handleSelectChain(undefined)}
            onKeyDown={(e) => handleNavKeyDown(e, 0)}
            onFocus={() => setFocusedIndex(0)}
            aria-pressed={!selectedChain}
            tabIndex={focusedIndex === 0 || focusedIndex === -1 ? 0 : -1}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-2 py-2 min-h-[40px]',
              'text-xs font-medium transition-colors duration-100',
              'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              !selectedChain ? 'bg-accent text-foreground' : 'text-muted-foreground'
            )}
          >
            <AllChainsLogo className="h-5 w-5 rounded-full shrink-0" />
            <span className="truncate">All Chains</span>
          </button>
        </li>

        {/* Starred chains group */}
        {starredChains.length > 0 && (
          <>
            <li role="listitem" aria-hidden="true">
              <div className="flex items-center gap-1 px-2 pt-2 pb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Starred
                </span>
                {starTooltip}
              </div>
            </li>
            {starredChains.map((chain, i) => renderChainRow(chain, i + 1))}
          </>
        )}

        {/* Other chains — labeled "Chains A-Z" only when starred group also exists */}
        {otherChains.length > 0 && (
          <>
            <li role="listitem" aria-hidden="true">
              <div className="flex items-center gap-1 px-2 pt-2 pb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {starredChains.length > 0 ? 'Chains A-Z' : 'Chains'}
                </span>
                {starredChains.length === 0 && starTooltip}
              </div>
            </li>
            {otherChains.map((chain, i) =>
              renderChainRow(chain, starredChains.length + 1 + i)
            )}
          </>
        )}

        {/* Empty state */}
        {filteredChains.length === 0 && (
          <li role="listitem" className="px-2 py-4 text-center text-xs text-muted-foreground">
            No chains match &ldquo;{chainSearch}&rdquo;
          </li>
        )}
      </ul>
    </nav>
  )
}
