import {
  type FC,
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback
} from 'react'
import { Button, Flex, Text, Input, Box } from '../../primitives/index.js'
import ChainIcon from '../../primitives/ChainIcon.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faMagnifyingGlass,
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
  starredChainIds
}) => {
  const [open, setOpen] = useState(false)
  const [chainSearchInput, setChainSearchInput] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const chainFuse = new Fuse(options, fuseSearchOptions)

  const { allChainsOption, starredChains, alphabeticalChains } = useMemo(
    () => groupChains(options, popularChainIds, starredChainIds),
    [options, popularChainIds, starredChainIds]
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

  // Click outside handler
  const handleClickOutside = useCallback((event: Event) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setOpen(false)
    }
  }, [])

  // Escape key handler
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      // Add a small delay to ensure the dropdown is fully rendered before adding listeners
      const timeoutId = setTimeout(() => {
        // Add multiple event types for better cross-platform support
        // Use capture phase to ensure we catch events before they bubble
        document.addEventListener('mousedown', handleClickOutside, true)
        document.addEventListener('touchstart', handleClickOutside, true)
        document.addEventListener('click', handleClickOutside, true)
        document.addEventListener('keydown', handleEscapeKey)
      }, 0)

      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside, true)
        document.removeEventListener('touchstart', handleClickOutside, true)
        document.removeEventListener('click', handleClickOutside, true)
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [open, handleClickOutside, handleEscapeKey])

  const handleSelect = (chain: ChainFilterValue) => {
    setOpen(false)
    onSelect(chain)
    setChainSearchInput('')
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Button
        aria-label={`Chain filter`}
        color="ghost"
        size="none"
        onClick={() => setOpen(!open)}
        css={{
          gap: '2',
          height: 40,
          width: '100%',
          px: '4 !important',
          cursor: 'pointer',
          display: 'flex',
          alignContent: 'center',
          lineHeight: '20px',
          backgroundColor: 'dropdown-background',
          borderRadius: 'dropdown-border-radius'
        }}
      >
        <Flex align="center" css={{ gap: '2' }}>
          {value.id ? (
            <ChainIcon
              chainId={value.id}
              width={20}
              height={20}
              css={{ borderRadius: 4, overflow: 'hidden' }}
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
          css={{
            color: 'gray9',
            marginLeft: 'auto',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            width: 12
          }}
        >
          <FontAwesomeIcon icon={faChevronDown} />
        </Text>
      </Button>

      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--relay-colors-modal-background)',
            borderRadius: 8,
            border: '1px solid var(--relay-colors-subtle-border-color)',
            boxShadow: '0px 0px 50px 0px #0000001F',
            padding: '8px',
            zIndex: 99999,
            maxHeight: '400px',
            overflow: 'hidden'
          }}
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
          onTouchStart={(e: React.TouchEvent) => e.stopPropagation()}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Input
            placeholder="Search for a chain"
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
            onKeyDown={(e) => e.stopPropagation()}
          />

          <div
            style={{
              overflowY: 'auto',
              borderRadius: 8,
              maxHeight: '290px',
              scrollbarColor: 'var(--relay-colors-gray5) transparent'
            }}
          >
            {filteredChains ? (
              filteredChains.length > 0 ? (
                filteredChains.map((chain) => {
                  const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                  return (
                    <div
                      key={chain.id?.toString() ?? 'all-chains'}
                      onClick={() => handleSelect(chain)}
                      style={{
                        padding: '8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'var(--relay-colors-gray6)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <ChainFilterRow
                        chain={chain}
                        tag={tag}
                        onToggleStar={onChainStarToggle}
                      />
                    </div>
                  )
                })
              ) : (
                <Text style="body1" css={{ p: '2', textAlign: 'center' }}>
                  No results.
                </Text>
              )
            ) : (
              <>
                {allChainsOption && (
                  <div
                    onClick={() => handleSelect(allChainsOption)}
                    style={{
                      padding: '8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        'var(--relay-colors-gray6)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <ChainFilterRow
                      chain={allChainsOption}
                      onToggleStar={onChainStarToggle}
                    />
                  </div>
                )}

                {starredChains.length > 0 && (
                  <>
                    <Text
                      style="subtitle2"
                      color="subtle"
                      css={{ px: '2', py: '1' }}
                    >
                      Starred Chains
                    </Text>
                    {starredChains.map((chain) => {
                      const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                      return (
                        <div
                          key={chain.id?.toString() ?? 'all-chains'}
                          onClick={() => handleSelect(chain)}
                          style={{
                            padding: '8px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'var(--relay-colors-gray6)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'transparent'
                          }}
                        >
                          <ChainFilterRow
                            chain={chain}
                            tag={tag}
                            onToggleStar={onChainStarToggle}
                          />
                        </div>
                      )
                    })}
                  </>
                )}

                <Text
                  style="subtitle2"
                  color="subtle"
                  css={{ px: '2', py: '1' }}
                >
                  Chains A-Z
                </Text>
                {alphabeticalChains.map((chain) => {
                  const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                  return (
                    <div
                      key={chain.id?.toString() ?? 'all-chains'}
                      onClick={() => handleSelect(chain)}
                      style={{
                        padding: '8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          'var(--relay-colors-gray6)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <ChainFilterRow
                        chain={chain}
                        tag={tag}
                        onToggleStar={onChainStarToggle}
                      />
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type ChainFilterRowProps = {
  chain: ChainFilterValue
  tag?: string
  onToggleStar?: () => void
}

const ChainFilterRow: FC<ChainFilterRowProps> = ({
  chain,
  tag,
  onToggleStar
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
      // Add a small delay to ensure the dropdown is fully rendered before adding listeners
      const timeoutId = setTimeout(() => {
        // Add multiple event types for better cross-platform support
        document.addEventListener('mousedown', handleClickOutside, true)
        document.addEventListener('touchstart', handleClickOutside, true)
        document.addEventListener('click', handleClickOutside, true)
        document.addEventListener('keydown', handleEscapeKey)
      }, 0)

      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside, true)
        document.removeEventListener('touchstart', handleClickOutside, true)
        document.removeEventListener('click', handleClickOutside, true)
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [dropdownOpen, handleClickOutside, handleEscapeKey])

  const handleToggleStar = () => {
    if (chain.id) {
      toggleStarredChain(chain.id)
      onToggleStar?.()
      setDropdownOpen(false)
    }
  }

  // Long press handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!chain.id) return
    e.preventDefault()
    const timer = setTimeout(() => {
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
        css={{
          gap: '2',
          cursor: 'pointer',
          flexShrink: 0,
          alignContent: 'center',
          width: '100%'
        }}
      >
        <AllChainsLogo style={{ width: 24, height: 24 }} />
        <Text style="subtitle2">{chain.name}</Text>
      </Flex>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
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
        css={{
          gap: '2',
          cursor: 'pointer',
          flexShrink: 0,
          alignContent: 'center',
          width: '100%',
          position: 'relative'
        }}
      >
        <ChainIcon chainId={chain.id} square width={24} height={24} />
        <Text style="subtitle2">
          {('displayName' in chain && chain.displayName) || chain.name}
        </Text>
        {isStarred && (
          <Box css={{ color: 'primary9' }}>
            <FontAwesomeIcon icon={faStar} width={12} height={12} />
          </Box>
        )}
        {tag && <TagPill tag={tag} />}
      </Flex>

      {dropdownOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            minWidth: 160,
            zIndex: 999999
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
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
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
    </div>
  )
}

export default ChainFilter
