import { type FC, useRef, useState, useMemo, useEffect } from 'react'
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
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import Fuse from 'fuse.js'
import type { ChainFilterValue } from './ChainFilter.js'
import { EventNames } from '../../../constants/events.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import AllChainsLogo from '../../../img/AllChainsLogo.js'
import { TagPill } from './TagPill.js'
import { groupChains } from '../../../utils/tokenSelector.js'

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
  context
}) => {
  const [chainSearchInput, setChainSearchInput] = useState('')
  const chainFuse = new Fuse(options, fuseSearchOptions)
  const activeChainRef = useRef<HTMLButtonElement | null>(null)
  const [hasScrolledOnOpen, setHasScrolledOnOpen] = useState(false)

  const { allChainsOption, popularChains, alphabeticalChains } = useMemo(
    () => groupChains(options, popularChainIds),
    [options, popularChainIds]
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
                    value="all-chains"
                    key="all-chains"
                  />
                </>
              )}

              {popularChains.length > 0 && (
                <>
                  <Text
                    style="subtitle2"
                    color="subtle"
                    css={{ px: '2', py: '1' }}
                  >
                    Popular Chains
                  </Text>
                  {popularChains.map((chain) => {
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
                        activeChainRef={active ? activeChainRef : undefined}
                        value={chain.id?.toString()}
                        key={chain.id?.toString()}
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
  activeChainRef?: React.RefObject<HTMLButtonElement>
}

const ChainFilterRow: FC<ChainFilterRowProps> = ({
  chain,
  isActive,
  onClick,
  tag,
  value,
  activeChainRef
}) => {
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
        {chain.id ? (
          <ChainIcon chainId={chain.id} square width={24} height={24} />
        ) : (
          <AllChainsLogo style={{ width: 24, height: 24 }} />
        )}
        <Text style="subtitle1" ellipsify>
          {('displayName' in chain && chain.displayName) || chain.name}
        </Text>
        {tag && <TagPill tag={tag} />}
      </Button>
    </AccessibleListItem>
  )
}
