import {
  type FC,
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect
} from 'react'
import {
  Flex,
  Box,
  Input,
  ChainIcon,
  Text,
  Button,
  AccessibleList,
  AccessibleListItem
} from '../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faInfoCircle,
  faMagnifyingGlass,
  faStar,
  faXmark
} from '@fortawesome/free-solid-svg-icons'
import Fuse from 'fuse.js'
import type { ChainFilterValue } from './ChainFilter.js'
import { EventNames } from '../../../constants/events.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import AllChainsLogo from '../../../img/AllChainsLogo.js'
import { TagPill } from './TagPill.js'
import { groupChains } from '../../../utils/tokenSelector.js'
import {
  isChainStarred,
  toggleStarredChain
} from '../../../utils/localStorage.js'
import Tooltip from '../../../components/primitives/Tooltip.js'
import { cn } from '../../../utils/cn.js'

type MobileChainSelectorProps = {
  options: (RelayChain | { id: undefined; name: string })[]
  value: ChainFilterValue
  sameChainOption?: RelayChain
  onSelect: (value: ChainFilterValue) => void
  onBack: () => void
  onClose: () => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  popularChainIds?: number[]
  context: 'from' | 'to'
  onChainStarToggle?: () => void
  starredChainIds?: number[]
}

const fuseSearchOptions = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.2,
  keys: ['id', 'name', 'displayName']
}

export const MobileChainSelector: FC<MobileChainSelectorProps> = ({
  options,
  value,
  sameChainOption,
  onSelect,
  onBack,
  onClose,
  onAnalyticEvent,
  popularChainIds,
  context,
  onChainStarToggle,
  starredChainIds
}) => {
  const [chainSearchInput, setChainSearchInput] = useState('')
  const chainFuse = new Fuse(options, fuseSearchOptions)

  const { allChainsOption, starredChains, alphabeticalChains } = useMemo(
    () => groupChains(options, popularChainIds, starredChainIds),
    [options, popularChainIds, starredChainIds]
  )

  const filteredChains = useMemo(() => {
    if (chainSearchInput.trim() === '') {
      return null // Return null to show organized sections
    }

    // Remove duplicates from search results
    const results = chainFuse.search(chainSearchInput)
    const uniqueChains = new Map()
    results.forEach((result) => {
      if (!uniqueChains.has(result.item.id)) {
        uniqueChains.set(result.item.id, result.item)
      }
    })
    return Array.from(uniqueChains.values())
  }, [chainSearchInput, chainFuse])

  const handleChainSelect = useCallback(
    (chain: ChainFilterValue) => {
      onSelect(chain)
      onBack() // Go back to token view after selection
    },
    [onSelect, onBack]
  )

  return (
    <Flex
      direction="column"
      className="relay-w-full relay-h-full relay-gap-3"
    >
      {/* Header with back button, search, and close */}
      <Flex
        align="center"
        className="relay-gap-1 relay-w-full"
      >
        <Button
          color="ghost"
          size="none"
          onClick={onBack}
          className="relay-p-2 relay-rounded-[8px] relay-flex relay-items-center relay-justify-center relay-min-w-[40px] relay-h-[40px] relay-text-[color:var(--relay-colors-gray9)]"
        >
          <FontAwesomeIcon icon={faArrowLeft} width={16} height={16} />
        </Button>

        <Input
          placeholder="Search a chain"
          icon={
            <Box className="relay-text-[color:var(--relay-colors-gray9)]">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                width={16}
                height={16}
              />
            </Box>
          }
          containerClassName="relay-flex-1 relay-h-[40px]"
          className="relay-w-full [&::placeholder]:relay-text-ellipsis"
          value={chainSearchInput}
          onChange={(e) =>
            setChainSearchInput((e.target as HTMLInputElement).value)
          }
        />

        <Button
          color="ghost"
          size="none"
          onClick={onClose}
          className="relay-p-2 relay-rounded-[8px] relay-flex relay-items-center relay-justify-center relay-min-w-[40px] relay-h-[40px] relay-text-[color:var(--relay-colors-gray9)]"
        >
          <FontAwesomeIcon icon={faXmark} width={16} height={16} />
        </Button>
      </Flex>

      {/* Chain List */}
      <AccessibleList
        onSelect={(selectedValue) => {
          if (selectedValue) {
            const isSameChainSelection = selectedValue === 'same-chain'
            const chain =
              selectedValue === 'all-chains'
                ? { id: undefined, name: 'All Chains' }
                : isSameChainSelection
                  ? sameChainOption
                : options.find(
                    (chain) => chain.id?.toString() === selectedValue
                  )
            if (chain) {
              const fromStarredList =
                !isSameChainSelection &&
                chain.id !== undefined &&
                starredChains.some((c) => c.id === chain.id)

              onAnalyticEvent?.(EventNames.CURRENCY_STEP_CHAIN_FILTER, {
                chain: isSameChainSelection ? 'Same Chain' : chain.name,
                chain_id: chain.id,
                search_term: chainSearchInput,
                context,
                from_starred_list: fromStarredList
              })
              handleChainSelect(chain)
            }
          }
        }}
        className="relay-flex relay-flex-col relay-w-full relay-flex-1 relay-overflow-y-auto [scrollbar-color:var(--relay-colors-gray5)_transparent]"
      >
        {filteredChains ? (
          // Show search results without sections
          filteredChains.map((chain) => {
            const tag = 'tags' in chain ? chain.tags?.[0] : undefined
            return (
              <MobileChainRow
                key={chain.id?.toString() ?? 'all-chains'}
                chain={chain}
                tag={tag}
                value={chain.id?.toString() ?? 'all-chains'}
                onChainStarToggle={onChainStarToggle}
                onAnalyticEvent={onAnalyticEvent}
              />
            )
          })
        ) : (
          // Show organized sections
          <>
            {allChainsOption && (
              <MobileChainRow
                chain={allChainsOption}
                value="all-chains"
                onAnalyticEvent={onAnalyticEvent}
              />
            )}
            {sameChainOption && (
              <AccessibleListItem value="same-chain" asChild>
                <Button
                  color="ghost"
                  size="none"
                  className="relay-py-3 relay-px-2 relay-flex relay-items-center relay-gap-2 relay-w-full relay-h-[56px] relay-rounded-[12px] hover:relay-bg-[var(--relay-colors-gray3)]"
                >
                  <ChainIcon
                    chainId={sameChainOption.id}
                    square
                    width={24}
                    height={24}
                  />
                  <Text style="subtitle1">Same Chain</Text>
                </Button>
              </AccessibleListItem>
            )}

            {starredChains.length > 0 && (
              <>
                <Flex align="center" className="relay-py-2 relay-gap-2">
                  <Box className="relay-text-[color:var(--relay-colors-primary9)]">
                    <FontAwesomeIcon icon={faStar} width={16} height={16} />
                  </Box>
                  <Text style="subtitle1" color="subtle">
                    Starred Chains
                  </Text>
                  <Tooltip
                    content={
                      <Text style="body3">Long-press to star a chain</Text>
                    }
                  >
                    <Box className="relay-text-[color:var(--relay-colors-gray9)]">
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        width={14}
                        height={14}
                      />
                    </Box>
                  </Tooltip>
                </Flex>
                {starredChains.map((chain) => {
                  const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                  return chain.id ? (
                    <MobileChainRow
                      key={chain.id.toString()}
                      chain={chain}
                      tag={tag}
                      value={chain.id.toString()}
                      onChainStarToggle={onChainStarToggle}
                      showStar={false}
                      onAnalyticEvent={onAnalyticEvent}
                    />
                  ) : null
                })}
              </>
            )}

            <Text style="subtitle1" color="subtle" className="relay-py-2">
              Chains A-Z
            </Text>
            {alphabeticalChains.map((chain) => {
              const tag = 'tags' in chain ? chain.tags?.[0] : undefined
              return chain.id ? (
                <MobileChainRow
                  key={chain.id.toString()}
                  chain={chain}
                  tag={tag}
                  value={chain.id.toString()}
                  onChainStarToggle={onChainStarToggle}
                  onAnalyticEvent={onAnalyticEvent}
                />
              ) : null
            })}
          </>
        )}
      </AccessibleList>
    </Flex>
  )
}

type MobileChainRowProps = {
  chain: ChainFilterValue
  tag?: string
  value: string
  onChainStarToggle?: () => void
  showStar?: boolean
  onAnalyticEvent?: (eventName: string, data?: any) => void
}

const MobileChainRow: FC<MobileChainRowProps> = ({
  chain,
  tag,
  value,
  onChainStarToggle,
  showStar = true,
  onAnalyticEvent
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isStarred = chain.id ? isChainStarred(chain.id) : false

  // Click outside handler for star dropdown
  const handleClickOutside = useCallback((event: Event) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setDropdownOpen(false)
    }
  }, [])

  // Escape key handler for star dropdown
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setDropdownOpen(false)
    }
  }, [])

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside, true)
      document.addEventListener('touchstart', handleClickOutside, true)
      document.addEventListener('click', handleClickOutside, true)
      document.addEventListener('keydown', handleEscapeKey)

      requestAnimationFrame(() => {
        dropdownRef.current?.scrollIntoView({ block: 'nearest' })
      })

      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true)
        document.removeEventListener('touchstart', handleClickOutside, true)
        document.removeEventListener('click', handleClickOutside, true)
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [dropdownOpen, handleClickOutside, handleEscapeKey])

  const handleToggleStar = useCallback(() => {
    if (chain.id) {
      const previouslyStarred = isStarred
      toggleStarredChain(chain.id)
      const eventName = previouslyStarred
        ? EventNames.CHAIN_UNSTARRED
        : EventNames.CHAIN_STARRED
      onAnalyticEvent?.(eventName, {
        chain: chain.name,
        chain_id: chain.id
      })
      onChainStarToggle?.()
      setDropdownOpen(false)
    }
  }, [chain.id, chain.name, isStarred, onAnalyticEvent, onChainStarToggle])

  // Long press handlers for mobile starring
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!chain.id) return
      const timer = setTimeout(() => {
        // Provide haptic feedback on long press
        if ('vibrate' in navigator) {
          navigator.vibrate(50) // Short 50ms vibration
        }
        setDropdownOpen(true)
      }, 500) // 500ms long press
      setLongPressTimer(timer)
    },
    [chain.id]
  )

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }, [longPressTimer])

  const handleTouchMove = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }, [longPressTimer])

  // Don't show context menu for "All Chains" option
  if (!chain.id) {
    return (
      <AccessibleListItem value={value} asChild>
        <Button
          color="ghost"
          size="none"
          className="relay-py-3 relay-px-2 relay-flex relay-items-center relay-gap-2 relay-w-full relay-h-[56px] relay-rounded-[12px] hover:relay-bg-[var(--relay-colors-gray3)]"
        >
          <AllChainsLogo style={{ width: 24, height: 24 }} />
          <Text style="subtitle1">{chain.name}</Text>
        </Button>
      </AccessibleListItem>
    )
  }

  return (
    <div className="relay-relative relay-w-full">
      <AccessibleListItem value={value} asChild>
        <Button
          color="ghost"
          size="none"
          onContextMenu={(e) => {
            e.preventDefault()
            setDropdownOpen(true)
          }}
          onKeyDown={(e) => {
            if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
              e.preventDefault()
              setDropdownOpen(true)
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          className="relay-py-3 relay-px-2 relay-flex relay-items-center relay-gap-2 relay-w-full relay-h-[56px] relay-rounded-[12px] relay-select-none hover:relay-bg-[var(--relay-colors-gray3)]"
        >
          <ChainIcon chainId={chain.id} square width={24} height={24} />
          <Text style="subtitle1" className="relay-flex-1 relay-text-left">
            {('displayName' in chain && chain.displayName) || chain.name}
          </Text>
          {showStar && isStarred && (
            <Box className="relay-text-[color:var(--relay-colors-primary9)]">
              <FontAwesomeIcon icon={faStar} width={16} height={16} />
            </Box>
          )}
          {tag && <TagPill tag={tag} />}
        </Button>
      </AccessibleListItem>

      {dropdownOpen && (
        <div
          ref={dropdownRef}
          className="relay-absolute relay-top-full relay-left-0 relay-mt-1 relay-min-w-[160px] relay-z-[999999]"
          onClick={(e) => {
            e.stopPropagation()
            handleToggleStar()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <Flex
            className="relay-items-center relay-gap-[8px] relay-p-[8px] relay-rounded-[12px] relay-cursor-pointer relay-bg-[var(--relay-colors-gray1)] relay-border relay-border-solid relay-border-[var(--relay-colors-subtle-border-color)] hover:relay-bg-[var(--relay-colors-gray2)]"
          >
            <Box
              className={cn(
                isStarred
                  ? 'relay-text-[color:var(--relay-colors-gray8)]'
                  : 'relay-text-[color:var(--relay-colors-primary9)]'
              )}
            >
              <FontAwesomeIcon icon={faStar} width={16} height={16} />
            </Box>
            <Text style="subtitle1" className="relay-leading-[20px]">
              {isStarred ? 'Unstar chain' : 'Star chain'}
            </Text>
          </Flex>
        </div>
      )}
    </div>
  )
}
