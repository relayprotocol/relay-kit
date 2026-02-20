import {
  type FC,
  useRef,
  useState,
  useMemo,
  useEffect,
  useCallback
} from 'react'
import {
  Flex,
  Box,
  ChainIcon,
  Text,
  Button,
  AccessibleList,
  AccessibleListItem
} from '../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle, faStar } from '@fortawesome/free-solid-svg-icons'
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
import { ChainSearchInput } from './ChainFilterRow.js'
import { cn } from '../../../utils/cn.js'

type ChainFilterSidebarProps = {
  options: (RelayChain | { id: undefined; name: string })[]
  value: ChainFilterValue
  isOpen: boolean
  onSelect: (value: ChainFilterValue) => void
  sameChainOption?: RelayChain
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onInputRef?: (element: HTMLInputElement | null) => void
  tokenSearchInputRef?: HTMLInputElement | null
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

export const ChainFilterSidebar: FC<ChainFilterSidebarProps> = ({
  options,
  value,
  isOpen,
  onSelect,
  sameChainOption,
  onAnalyticEvent,
  onInputRef,
  tokenSearchInputRef,
  popularChainIds,
  context,
  onChainStarToggle,
  starredChainIds
}) => {
  const [chainSearchInput, setChainSearchInput] = useState('')
  const chainFuse = new Fuse(options, fuseSearchOptions)
  const activeChainRef = useRef<HTMLButtonElement | null>(null)
  const [hasScrolledOnOpen, setHasScrolledOnOpen] = useState(false)

  const { allChainsOption, starredChains, alphabeticalChains } = useMemo(
    () => groupChains(options, popularChainIds, starredChainIds),
    [options, popularChainIds, starredChainIds, isOpen]
  )
  const isSameChainSelected =
    sameChainOption !== undefined && value.id === sameChainOption.id

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

  useEffect(() => {
    if (activeChainRef.current && isOpen && !hasScrolledOnOpen) {
      activeChainRef.current.scrollIntoView({
        behavior: 'instant',
        block: 'nearest'
      })
      setHasScrolledOnOpen(true)
    } else if (!isOpen) {
      setHasScrolledOnOpen(false)
      activeChainRef.current = null
    }
  }, [isOpen, hasScrolledOnOpen])

  return (
    <Flex
      direction="column"
      className="relay-max-w-[212px] relay-shrink-0 relay-gap-1 relay-bg-[var(--relay-colors-gray3)] relay-rounded-[12px] relay-p-3"
    >
      <AccessibleList
        onSelect={(selectedValue) => {
          if (selectedValue === 'input') return
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
              onSelect(chain)
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
            }
          }
        }}
        className="relay-flex relay-flex-col relay-w-full relay-h-full"
      >
        <AccessibleListItem value="input" asChild>
          <ChainSearchInput
            ref={onInputRef}
            placeholder="Search chains"
            value={chainSearchInput}
            onChange={setChainSearchInput}
          />
        </AccessibleListItem>

        <Flex
          direction="column"
          className="relay-flex-1 relay-overflow-y-auto relay-gap-1"
          style={{ scrollbarColor: 'var(--relay-colors-gray5) transparent' }}
        >
          {filteredChains ? (
            // Show search results without sections
            filteredChains.map((chain) => {
              const tag = 'tags' in chain ? chain.tags?.[0] : undefined
              const active = value.id === chain.id
              return (
                <ChainFilterRow
                  chain={chain}
                  isActive={active}
                  tag={tag}
                  onClick={(e) => {
                    if (e.detail > 0) {
                      tokenSearchInputRef?.focus()
                    }
                  }}
                  onChainStarToggle={onChainStarToggle}
                  value={chain.id?.toString() ?? 'all-chains'}
                  key={chain.id?.toString() ?? 'all-chains'}
                  onAnalyticEvent={onAnalyticEvent}
                />
              )
            })
          ) : (
            // Show organized sections
            <>
              {allChainsOption && (
                <>
                  <ChainFilterRow
                    chain={allChainsOption}
                    isActive={value.id === undefined}
                    onClick={(e) => {
                      if (e.detail > 0) {
                        tokenSearchInputRef?.focus()
                      }
                    }}
                    onChainStarToggle={onChainStarToggle}
                    value="all-chains"
                    key="all-chains"
                    onAnalyticEvent={onAnalyticEvent}
                  />
                  {sameChainOption && (
                    <AccessibleListItem value="same-chain" asChild>
                      <Button
                        color="ghost"
                        size="none"
                        onClick={(e) => {
                          if (e.detail > 0) {
                            tokenSearchInputRef?.focus()
                          }
                        }}
                        ref={isSameChainSelected ? activeChainRef : null}
                        className={cn(
                          'relay-p-2 relay-flex relay-items-center relay-gap-2 relay-relative relay-transition-[backdrop-filter] relay-duration-[250ms] relay-ease-linear focus:relay-shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)]',
                          isSameChainSelected
                            ? 'relay-bg-[var(--relay-colors-gray6)] hover:relay-bg-[var(--relay-colors-gray6)]'
                            : 'hover:relay-bg-[rgba(var(--relay-colors-gray-rgb,0,0,0),0.1)]'
                        )}
                      >
                        <ChainIcon
                          chainId={sameChainOption.id}
                          square
                          width={24}
                          height={24}
                        />
                        <Text style="subtitle1" ellipsify>
                          Same Chain
                        </Text>
                      </Button>
                    </AccessibleListItem>
                  )}
                </>
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
                        <Text style="body3">Right-click to star a chain</Text>
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
                    const active =
                      value.id === chain.id &&
                      !(isSameChainSelected && chain.id === sameChainOption?.id)
                    return chain.id ? (
                      <ChainFilterRow
                        chain={chain}
                        isActive={active}
                        tag={tag}
                        onClick={(e) => {
                          if (e.detail > 0) {
                            tokenSearchInputRef?.focus()
                          }
                        }}
                        onChainStarToggle={onChainStarToggle}
                        activeChainRef={active ? activeChainRef : undefined}
                        value={chain.id?.toString()}
                        key={chain.id?.toString()}
                        showStar={false}
                        onAnalyticEvent={onAnalyticEvent}
                      />
                    ) : null
                  })}
                </>
              )}

              <Text style="subtitle2" color="subtle" className="relay-px-2 relay-py-1">
                Chains A-Z
              </Text>
              {alphabeticalChains.map((chain) => {
                const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                const active =
                  value.id === chain.id &&
                  !(isSameChainSelected && chain.id === sameChainOption?.id)
                return chain.id ? (
                  <ChainFilterRow
                    chain={chain}
                    isActive={active}
                    tag={tag}
                    onClick={(e) => {
                      if (e.detail > 0) {
                        tokenSearchInputRef?.focus()
                      }
                    }}
                    onChainStarToggle={onChainStarToggle}
                    activeChainRef={active ? activeChainRef : undefined}
                    value={chain.id?.toString()}
                    key={chain.id?.toString()}
                    onAnalyticEvent={onAnalyticEvent}
                  />
                ) : null
              })}
            </>
          )}
        </Flex>
      </AccessibleList>
    </Flex>
  )
}

type ChainFilterRowProps = {
  chain: ChainFilterValue
  isActive?: boolean
  onClick?: (e: React.MouseEvent) => void
  tag?: string
  value: string
  activeChainRef?: React.RefObject<HTMLButtonElement | null>
  onChainStarToggle?: () => void
  showStar?: boolean
  onAnalyticEvent?: (eventName: string, data?: any) => void
}

const ChainFilterRow: FC<ChainFilterRowProps> = ({
  chain,
  isActive,
  onClick,
  tag,
  value,
  activeChainRef,
  onChainStarToggle,
  showStar = true,
  onAnalyticEvent
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isStarred = chain.id ? isChainStarred(chain.id) : false

  // Click outside handler
  const handleClickOutside = useCallback((event: MouseEvent | TouchEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setDropdownOpen(false)
    }
  }, [])

  // Escape key handler
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setDropdownOpen(false)
    }
  }, [])

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)

      requestAnimationFrame(() => {
        dropdownRef.current?.scrollIntoView({ block: 'nearest' })
      })
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
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
      onChainStarToggle?.()
      setDropdownOpen(false)
    }
  }

  // Don't show context menu for "All Chains" option
  if (!chain.id) {
    return (
      <AccessibleListItem value={value} asChild>
        <Button
          color="ghost"
          size="none"
          onClick={onClick}
          ref={isActive ? activeChainRef : null}
          className={cn(
            'relay-p-2 relay-flex relay-items-center relay-gap-2 relay-relative relay-transition-[backdrop-filter] relay-duration-[250ms] relay-ease-linear focus:relay-shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)]',
            isActive
              ? 'relay-bg-[var(--relay-colors-gray6)] hover:relay-bg-[var(--relay-colors-gray6)]'
              : 'hover:relay-bg-[rgba(var(--relay-colors-gray-rgb,0,0,0),0.1)]'
          )}
        >
          <AllChainsLogo style={{ width: 24, height: 24 }} />
          <Text style="subtitle1" ellipsify>
            {chain.name}
          </Text>
        </Button>
      </AccessibleListItem>
    )
  }

  return (
    <Flex className="relay-relative relay-w-full">
      <AccessibleListItem value={value} asChild>
        <Button
          color="ghost"
          size="none"
          onClick={onClick}
          ref={isActive ? activeChainRef : null}
          onContextMenu={(e) => {
            e.preventDefault()
            setDropdownOpen(true)
          }}
          onKeyDown={(e) => {
            if ((e.shiftKey && e.key === 'F10') || e.key === 'ContextMenu') {
              e.preventDefault()
              setDropdownOpen(true)
            } else if (
              ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)
            ) {
              // Close dropdown when navigating away
              if (dropdownOpen) {
                setDropdownOpen(false)
              }
            }
          }}
          className={cn(
            'relay-p-2 relay-flex relay-items-center relay-gap-2 relay-w-full relay-transition-[backdrop-filter] relay-duration-[250ms] relay-ease-linear focus:relay-shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)]',
            isActive
              ? 'relay-bg-[var(--relay-colors-gray6)] hover:relay-bg-[var(--relay-colors-gray6)]'
              : 'hover:relay-bg-[rgba(var(--relay-colors-gray-rgb,0,0,0),0.1)]'
          )}
        >
          <ChainIcon chainId={chain.id} square width={24} height={24} />
          <Text style="subtitle1" ellipsify>
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
          className="relay-absolute relay-top-full relay-left-0 relay-mt-1 relay-min-w-[140px] relay-z-[9999]"
          onClick={(e) => {
            e.stopPropagation()
            handleToggleStar()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <Flex
            className="relay-flex relay-items-center relay-gap-[6px] relay-p-3 relay-rounded-[12px] relay-cursor-pointer relay-bg-[var(--relay-colors-modal-background)] hover:relay-bg-[var(--relay-colors-gray2)]"
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
    </Flex>
  )
}
