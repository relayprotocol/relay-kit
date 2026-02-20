import {
  type FC,
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback
} from 'react'
import { Dropdown } from '../../primitives/Dropdown.js'
import { Button, Flex, Text, Box } from '../../primitives/index.js'
import ChainIcon from '../../primitives/ChainIcon.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faInfoCircle,
  faStar
} from '@fortawesome/free-solid-svg-icons'
import type { ChainVM, RelayChain } from '@relayprotocol/relay-sdk'
import AllChainsLogo from '../../../img/AllChainsLogo.js'
import { TagPill } from './TagPill.js'
import Fuse from 'fuse.js'
import { groupChains } from '../../../utils/tokenSelector.js'
import {
  isChainStarred,
  toggleStarredChain
} from '../../../utils/localStorage.js'
import Tooltip from '../../../components/primitives/Tooltip.js'
import { EventNames } from '../../../constants/events.js'
import { ChainSearchInput } from './ChainFilterRow.js'
import { cn } from '../../../utils/cn.js'

export type ChainFilterValue =
  | RelayChain
  | { id: undefined; name: string; vmType?: ChainVM }

type Props = {
  options: ChainFilterValue[]
  value: ChainFilterValue
  onSelect: (value: ChainFilterValue) => void
  popularChainIds?: number[]
  onChainStarToggle?: () => void
  starredChainIds?: number[]
  onAnalyticEvent?: (eventName: string, data?: any) => void
}

const fuseSearchOptions = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.2,
  keys: ['id', 'name', 'displayName']
}

const ChainFilter: FC<Props> = ({
  options,
  value,
  onSelect,
  popularChainIds,
  onChainStarToggle,
  starredChainIds,
  onAnalyticEvent
}) => {
  const [open, setOpen] = useState(false)
  const [chainSearchInput, setChainSearchInput] = useState('')
  const chainFuse = new Fuse(options, fuseSearchOptions)

  const { allChainsOption, starredChains, alphabeticalChains } = useMemo(
    () => groupChains(options, popularChainIds, starredChainIds),
    [options, popularChainIds, starredChainIds, open]
  )

  const filteredChains = useMemo(() => {
    if (chainSearchInput.trim() === '') {
      return null
    }
    const results = chainFuse.search(chainSearchInput)
    const uniqueChains = new Map()
    results.forEach((result) => {
      if (!uniqueChains.has(result.item.id)) {
        uniqueChains.set(result.item.id, result.item)
      }
    })
    return Array.from(uniqueChains.values())
  }, [chainSearchInput, chainFuse])

  return (
    <Dropdown
      open={open}
      onOpenChange={(open) => setOpen(open)}
      trigger={
        <Button
          aria-label={`Chain filter`}
          color="ghost"
          size="none"
          className="relay-gap-2 relay-h-[40px] relay-w-full !relay-px-4 relay-cursor-pointer relay-flex relay-content-center relay-leading-[20px] relay-bg-[var(--relay-colors-dropdown-background)] relay-rounded-dropdown"
        >
          <Flex align="center" className="relay-gap-2">
            {value.id ? (
              <ChainIcon
                chainId={value.id}
                width={20}
                height={20}
                className="relay-rounded-[4px] relay-overflow-hidden"
              />
            ) : (
              <AllChainsLogo style={{ width: 20, height: 20 }} />
            )}
            <Text style="subtitle1">
              {('displayName' in value && value.displayName) || value.name}
            </Text>
          </Flex>
          <Text
            style="body1"
            className={cn(
              'relay-text-[color:var(--relay-colors-gray9)] relay-ml-auto relay-w-[12px]',
              open ? 'relay-rotate-180' : 'relay-rotate-0'
            )}
          >
            <FontAwesomeIcon icon={faChevronDown} />
          </Text>
        </Button>
      }
      contentProps={{
        align: 'start',
        avoidCollisions: false,
        className: 'relay-p-0 relay-mx-0',
        style: {
          width: 'var(--radix-popper-anchor-width)',
          minWidth: 'var(--radix-popper-anchor-width)'
        }
      }}
    >
      <Flex direction="column" className="relay-p-2">
        <ChainSearchInput
          value={chainSearchInput}
          onChange={setChainSearchInput}
          onKeyDown={(event) => event.stopPropagation()}
        />
        <Flex
          direction="column"
          className="relay-overflow-y-auto relay-rounded-[8px] relay-max-h-[290px]"
          style={{ scrollbarColor: 'var(--relay-colors-gray5) transparent' }}
        >
          {filteredChains ? (
            filteredChains.length > 0 ? (
              filteredChains.map((chain) => {
                const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                return (
                  <Flex
                    key={chain.id?.toString() ?? 'all-chains'}
                    onClick={() => {
                      setOpen(false)
                      onSelect(chain)
                      setChainSearchInput('')
                    }}
                    className="relay-p-[8px] relay-rounded-[4px] relay-cursor-pointer relay-bg-[var(--relay-colors-modal-background)] hover:relay-bg-[var(--relay-colors-gray3)]"
                  >
                    <ChainFilterRow
                      chain={chain}
                      tag={tag}
                      onToggleStar={onChainStarToggle}
                      onAnalyticEvent={onAnalyticEvent}
                    />
                  </Flex>
                )
              })
            ) : (
              <Text style="body1" className="relay-p-2 relay-text-center">
                No results.
              </Text>
            )
          ) : (
            <>
              {allChainsOption && (
                <Flex
                  onClick={() => {
                    setOpen(false)
                    onSelect(allChainsOption)
                    setChainSearchInput('')
                  }}
                  className="relay-p-[8px] relay-rounded-[4px] relay-cursor-pointer relay-bg-[var(--relay-colors-modal-background)] hover:relay-bg-[var(--relay-colors-gray3)]"
                >
                  <ChainFilterRow
                    chain={allChainsOption}
                    onAnalyticEvent={onAnalyticEvent}
                  />
                </Flex>
              )}

              {starredChains.length > 0 && (
                <>
                  <Flex align="center" className="relay-px-2 relay-py-1 relay-gap-1">
                    <Box className="relay-text-[color:var(--relay-colors-primary9)]">
                      <FontAwesomeIcon icon={faStar} width={12} height={12} />
                    </Box>
                    <Text style="subtitle2" color="subtle">
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
                          width={12}
                          height={12}
                        />
                      </Box>
                    </Tooltip>
                  </Flex>
                  {starredChains.map((chain) => {
                    const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                    return (
                      <Flex
                        key={chain.id?.toString() ?? 'all-chains'}
                        onClick={() => {
                          setOpen(false)
                          onSelect(chain)
                          setChainSearchInput('')
                        }}
                        className="relay-p-[8px] relay-rounded-[4px] relay-cursor-pointer relay-bg-[var(--relay-colors-modal-background)] hover:relay-bg-[var(--relay-colors-gray3)]"
                      >
                        <ChainFilterRow
                          chain={chain}
                          tag={tag}
                          onToggleStar={onChainStarToggle}
                          showStar={false}
                          onAnalyticEvent={onAnalyticEvent}
                        />
                      </Flex>
                    )
                  })}
                </>
              )}

              <Text style="subtitle2" color="subtle" className="relay-px-2 relay-py-1">
                Chains A-Z
              </Text>
              {alphabeticalChains.map((chain) => {
                const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                return (
                  <Flex
                    key={chain.id?.toString() ?? 'all-chains'}
                    onClick={() => {
                      setOpen(false)
                      onSelect(chain)
                      setChainSearchInput('')
                    }}
                    className="relay-p-[8px] relay-rounded-[4px] relay-cursor-pointer relay-bg-[var(--relay-colors-modal-background)] hover:relay-bg-[var(--relay-colors-gray3)]"
                  >
                    <ChainFilterRow
                      chain={chain}
                      tag={tag}
                      onToggleStar={onChainStarToggle}
                      onAnalyticEvent={onAnalyticEvent}
                    />
                  </Flex>
                )
              })}
            </>
          )}
        </Flex>
      </Flex>
    </Dropdown>
  )
}

type ChainFilterRowProps = {
  chain: ChainFilterValue
  tag?: string
  onToggleStar?: () => void
  showStar?: boolean
  onAnalyticEvent?: (eventName: string, data?: any) => void
}

const ChainFilterRow: FC<ChainFilterRowProps> = ({
  chain,
  tag,
  onToggleStar,
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

  const handleToggleStar = () => {
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
      onToggleStar?.()
      setDropdownOpen(false)
    }
  }

  // Long press handlers for mobile
  const handleTouchStart = (_e: React.TouchEvent) => {
    if (!chain.id) return
    const timer = setTimeout(() => {
      // Provide haptic feedback on long press
      if ('vibrate' in navigator) {
        navigator.vibrate(50) // Short 50ms vibration
      }
      setDropdownOpen(true)
    }, 500) // 500ms long press
    setLongPressTimer(timer)
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleTouchMove = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Don't show context menu for "All Chains" option
  if (!chain.id) {
    return (
      <Flex
        align="center"
        className="relay-gap-2 relay-cursor-pointer relay-shrink-0 relay-content-center relay-w-full"
      >
        <AllChainsLogo style={{ width: 24, height: 24 }} />
        <Text style="subtitle2">{chain.name}</Text>
      </Flex>
    )
  }

  return (
    <div className="relay-relative relay-w-full">
      <Flex
        align="center"
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
        className="relay-gap-2 relay-cursor-pointer relay-shrink-0 relay-content-center relay-w-full relay-relative relay-select-none"
      >
        <ChainIcon chainId={chain.id} square width={24} height={24} />
        <Text style="subtitle2">
          {('displayName' in chain && chain.displayName) || chain.name}
        </Text>
        {showStar && isStarred && (
          <Box className="relay-text-[color:var(--relay-colors-primary9)]">
            <FontAwesomeIcon icon={faStar} width={12} height={12} />
          </Box>
        )}
        {tag && <TagPill tag={tag} />}
      </Flex>

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

export default ChainFilter
