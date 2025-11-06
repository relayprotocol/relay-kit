import {
  type FC,
  useState,
  useMemo,
  forwardRef,
  useRef,
  useEffect,
  useCallback
} from 'react'
import { Flex, Text, Box, Button, ChainIcon } from '../../primitives/index.js'
import { Dropdown, DropdownMenuItem } from '../../primitives/Dropdown.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faStar } from '@fortawesome/free-solid-svg-icons'
import { type ChainFilterValue } from './ChainFilter.js'
import AllChainsLogo from '../../../img/AllChainsLogo.js'
import Fuse from 'fuse.js'
import { groupChains } from '../../../utils/tokenSelector.js'
import { ChainFilterRow, ChainSearchInput } from './ChainFilterRow.js'

type ChainFilterTriggerProps = {
  value: ChainFilterValue
  open: boolean
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'>

const ChainFilterTrigger = forwardRef<
  HTMLButtonElement,
  ChainFilterTriggerProps
>(({ value, open, ...props }, ref) => (
  <Button
    {...props}
    ref={ref}
    aria-label="Chain filter"
    color="ghost"
    size="none"
    css={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      height: 40,
      px: '12px',
      cursor: 'pointer',
      backgroundColor: 'dropdown-background',
      borderRadius: 'dropdown-border-radius',
      flexShrink: 0,
      '--focusColor': 'colors.focus-color',
      _focusVisible: {
        boxShadow: 'inset 0 0 0 2px var(--focusColor)'
      }
    }}
  >
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
    <Box css={{ color: 'gray9' }}>
      <FontAwesomeIcon
        icon={faChevronDown}
        width={12}
        height={12}
        style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s'
        }}
      />
    </Box>
  </Button>
))

type CompactChainFilterProps = {
  options: ChainFilterValue[]
  value: ChainFilterValue
  onSelect: (value: ChainFilterValue) => void
  popularChainIds?: number[]
  onChainStarToggle?: () => void
  starredChainIds?: number[]
  onAnalyticEvent?: (eventName: string, data?: any) => void
}

export const CompactChainFilter: FC<CompactChainFilterProps> = ({
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
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const chainFuse = new Fuse(options, {
    includeScore: true,
    includeMatches: true,
    threshold: 0.2,
    keys: ['id', 'name', 'displayName']
  })

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

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    } else {
      setChainSearchInput('')
    }
  }, [open])

  const focusDropdownItem = useCallback((position: 'first' | 'last') => {
    const container = searchInputRef.current?.closest(
      '[data-chain-dropdown]'
    ) as HTMLElement | null
    if (!container) return

    const items = Array.from(
      container.querySelectorAll<HTMLElement>('[data-chain-dropdown-item]')
    )
    if (items.length === 0) return

    const target = position === 'first' ? items[0] : items[items.length - 1]
    target.focus()
  }, [])

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        focusDropdownItem('first')
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        focusDropdownItem('last')
      }
    },
    [focusDropdownItem]
  )

  return (
    <Dropdown
      open={open}
      onOpenChange={(open) => setOpen(open)}
      trigger={<ChainFilterTrigger value={value} open={open} />}
      contentProps={{
        align: 'end',
        avoidCollisions: false,
        css: {
          p: 0,
          minWidth: '100%',
          maxWidth: '100%',
          mx: '0'
        }
      }}
    >
      <Flex direction="column" css={{ p: '2' }} data-chain-dropdown="true">
        <ChainSearchInput
          ref={searchInputRef}
          value={chainSearchInput}
          onChange={setChainSearchInput}
          onKeyDown={(event) => {
            event.stopPropagation()
            handleSearchKeyDown(event)
          }}
        />
        <Flex
          direction="column"
          css={{
            overflowY: 'auto',
            borderRadius: 8,
            maxHeight: 290,
            scrollbarColor: 'var(--relay-colors-gray5) transparent'
          }}
        >
          {filteredChains ? (
            filteredChains.length > 0 ? (
              filteredChains.map((chain) => {
                const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                return (
                  <DropdownMenuItem
                    key={chain.id?.toString() ?? 'all-chains'}
                    data-chain-dropdown-item
                    onSelect={() => {
                      onSelect(chain)
                      setOpen(false)
                      setChainSearchInput('')
                    }}
                    css={{
                      padding: '8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      backgroundColor: 'modal-background',
                      outline: 'none',
                      _hover: {
                        backgroundColor: 'gray3'
                      },
                      _focus: {
                        backgroundColor: 'gray3'
                      }
                    }}
                  >
                    <ChainFilterRow
                      chain={chain}
                      tag={tag}
                      onToggleStar={onChainStarToggle}
                      onAnalyticEvent={onAnalyticEvent}
                    />
                  </DropdownMenuItem>
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
                <DropdownMenuItem
                  data-chain-dropdown-item
                  onSelect={() => {
                    setOpen(false)
                    onSelect(allChainsOption)
                    setChainSearchInput('')
                  }}
                  css={{
                    padding: '8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    backgroundColor: 'modal-background',
                    outline: 'none',
                    _hover: {
                      backgroundColor: 'gray3'
                    },
                    _focus: {
                      backgroundColor: 'gray3'
                    }
                  }}
                >
                  <ChainFilterRow
                    chain={allChainsOption}
                    onAnalyticEvent={onAnalyticEvent}
                  />
                </DropdownMenuItem>
              )}

              {starredChains.length > 0 && (
                <>
                  <Flex align="center" css={{ px: '2', py: '1', gap: '1' }}>
                    <Box css={{ color: 'primary9' }}>
                      <FontAwesomeIcon icon={faStar} width={12} height={12} />
                    </Box>
                    <Text style="subtitle2" color="subtle">
                      Starred Chains
                    </Text>
                  </Flex>
                  {starredChains.map((chain: ChainFilterValue) => {
                    const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                    return (
                      <DropdownMenuItem
                        key={chain.id?.toString() ?? 'all-chains'}
                        data-chain-dropdown-item
                        onSelect={() => {
                          onSelect(chain)
                          setOpen(false)
                          setChainSearchInput('')
                        }}
                        css={{
                          padding: '8px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          backgroundColor: 'modal-background',
                          outline: 'none',
                          _hover: {
                            backgroundColor: 'gray3'
                          },
                          _focus: {
                            backgroundColor: 'gray3'
                          }
                        }}
                      >
                        <ChainFilterRow
                          chain={chain}
                          tag={tag}
                          onToggleStar={onChainStarToggle}
                          showStar={false}
                          onAnalyticEvent={onAnalyticEvent}
                        />
                      </DropdownMenuItem>
                    )
                  })}
                </>
              )}

              <Text style="subtitle2" color="subtle" css={{ px: '2', py: '1' }}>
                Chains A-Z
              </Text>
              {alphabeticalChains.map((chain: ChainFilterValue) => {
                const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                return (
                  <DropdownMenuItem
                    key={chain.id?.toString() ?? 'all-chains'}
                    data-chain-dropdown-item
                    onSelect={() => {
                      onSelect(chain)
                      setOpen(false)
                      setChainSearchInput('')
                    }}
                    css={{
                      padding: '8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      backgroundColor: 'modal-background',
                      outline: 'none',
                      _hover: {
                        backgroundColor: 'gray3'
                      },
                      _focus: {
                        backgroundColor: 'gray3'
                      }
                    }}
                  >
                    <ChainFilterRow
                      chain={chain}
                      tag={tag}
                      onToggleStar={onChainStarToggle}
                      onAnalyticEvent={onAnalyticEvent}
                    />
                  </DropdownMenuItem>
                )
              })}
            </>
          )}
        </Flex>
      </Flex>
    </Dropdown>
  )
}
