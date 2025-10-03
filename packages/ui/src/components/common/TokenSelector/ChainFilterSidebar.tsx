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
  Input,
  ChainIcon,
  Text,
  Button,
  AccessibleList,
  AccessibleListItem
} from '../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faInfoCircle,
  faMagnifyingGlass,
  faStar
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

type ChainFilterSidebarProps = {
  options: (RelayChain | { id: undefined; name: string })[]
  value: ChainFilterValue
  isOpen: boolean
  onSelect: (value: ChainFilterValue) => void
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
      css={{
        maxWidth: 212,
        flexShrink: 0,
        gap: '1',
        bg: 'gray3',
        borderRadius: 12,
        p: '3'
      }}
    >
      <AccessibleList
        onSelect={(selectedValue) => {
          if (selectedValue === 'input') return
          if (selectedValue) {
            const chain =
              selectedValue === 'all-chains'
                ? { id: undefined, name: 'All Chains' }
                : options.find(
                    (chain) => chain.id?.toString() === selectedValue
                  )
            if (chain) {
              onSelect(chain)
              onAnalyticEvent?.(EventNames.CURRENCY_STEP_CHAIN_FILTER, {
                chain: chain.name,
                chain_id: chain.id,
                search_term: chainSearchInput,
                context
              })
            }
          }
        }}
        css={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%'
        }}
      >
        <AccessibleListItem value="input" asChild>
          <Input
            ref={onInputRef}
            data-testid="chain-search-input"
            placeholder="Search chains"
            icon={
              <Box css={{ color: 'gray9' }}>
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  width={16}
                  height={16}
                />
              </Box>
            }
            containerCss={{
              width: '100%',
              height: 40,
              mb: '2'
            }}
            css={{
              width: '100%',
              _placeholder_parent: {
                textOverflow: 'ellipsis'
              },
              '--borderColor': 'colors.subtle-border-color',
              border: '1px solid var(--borderColor)',
              backgroundColor: 'modal-background'
            }}
            value={chainSearchInput}
            onChange={(e) =>
              setChainSearchInput((e.target as HTMLInputElement).value)
            }
          />
        </AccessibleListItem>

        <Flex
          direction="column"
          css={{
            flex: 1,
            overflowY: 'auto',
            gap: '1',
            scrollbarColor: 'var(--relay-colors-gray5) transparent'
          }}
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
                  />
                </>
              )}

              {starredChains.length > 0 && (
                <>
                  <Flex align="center">
                    <Text
                      style="subtitle2"
                      color="subtle"
                      css={{ px: '2', py: '1' }}
                    >
                      Starred Chains
                    </Text>
                    <Tooltip
                      content={
                        <Text style="body3">Right-click to star a chain</Text>
                      }
                    >
                      <Box css={{ color: 'gray9' }}>
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
                    const active = value.id === chain.id
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
                      />
                    ) : null
                  })}
                </>
              )}

              <Text style="subtitle2" color="subtle" css={{ px: '2', py: '1' }}>
                Chains A-Z
              </Text>
              {alphabeticalChains.map((chain) => {
                const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                const active = value.id === chain.id
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
}

const ChainFilterRow: FC<ChainFilterRowProps> = ({
  chain,
  isActive,
  onClick,
  tag,
  value,
  activeChainRef,
  onChainStarToggle,
  showStar = true
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
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [dropdownOpen, handleClickOutside, handleEscapeKey])

  const handleToggleStar = () => {
    if (chain.id) {
      toggleStarredChain(chain.id)
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
          css={{
            p: '2',
            display: 'flex',
            alignItems: 'center',
            gap: '2',
            position: 'relative',
            ...(isActive && {
              backgroundColor: 'gray6'
            }),
            transition: 'backdrop-filter 250ms linear',
            _hover: {
              backgroundColor: isActive ? 'gray6' : 'gray/10'
            },
            '--focusColor': 'colors.focus-color',
            _focus: {
              boxShadow: 'inset 0 0 0 2px var(--focusColor)'
            }
          }}
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
    <Flex css={{ position: 'relative', width: '100%' }}>
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
          css={{
            p: '2',
            display: 'flex',
            alignItems: 'center',
            gap: '2',
            width: '100%',
            ...(isActive && {
              backgroundColor: 'gray6'
            }),
            transition: 'backdrop-filter 250ms linear',
            _hover: {
              backgroundColor: isActive ? 'gray6' : 'gray/10'
            },
            '--focusColor': 'colors.focus-color',
            _focus: {
              boxShadow: 'inset 0 0 0 2px var(--focusColor)'
            }
          }}
        >
          <ChainIcon chainId={chain.id} square width={24} height={24} />
          <Text style="subtitle1" ellipsify>
            {('displayName' in chain && chain.displayName) || chain.name}
          </Text>
          {showStar && isStarred && (
            <Box css={{ color: 'primary9' }}>
              <FontAwesomeIcon icon={faStar} width={16} height={16} />
            </Box>
          )}
          {tag && <TagPill tag={tag} />}
        </Button>
      </AccessibleListItem>

      {dropdownOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            minWidth: 140,
            zIndex: 9999
          }}
          onClick={(e) => {
            e.stopPropagation()
            handleToggleStar()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <Flex
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3',
              borderRadius: 12,
              cursor: 'pointer',
              backgroundColor: 'modal-background',
              _hover: {
                backgroundColor: 'gray2'
              }
            }}
          >
            <Box
              css={{
                color: isStarred ? 'gray8' : 'primary9'
              }}
            >
              <FontAwesomeIcon icon={faStar} width={16} height={16} />
            </Box>
            <Text style="subtitle1" css={{ lineHeight: '20px' }}>
              {isStarred ? 'Unstar chain' : 'Star chain'}
            </Text>
          </Flex>
        </div>
      )}
    </Flex>
  )
}
