import { type FC, useMemo } from 'react'
import { Flex, Button, Text, ChainIcon } from '../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import type { ChainFilterValue } from './ChainFilter.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import { groupChains } from '../../../utils/tokenSelector.js'
import { EventNames } from '../../../constants/events.js'

type ChainShortcutsProps = {
  options: (RelayChain | { id: undefined; name: string })[]
  value: ChainFilterValue
  onSelect: (value: ChainFilterValue) => void
  onMoreClick: () => void
  popularChainIds?: number[]
  starredChainIds?: number[]
  onAnalyticEvent?: (eventName: string, data?: any) => void
  context?: 'from' | 'to'
}

export const ChainShortcuts: FC<ChainShortcutsProps> = ({
  options,
  value,
  onSelect,
  onMoreClick,
  popularChainIds,
  starredChainIds,
  onAnalyticEvent,
  context
}) => {
  const shortcutChains = useMemo(() => {
    const { allChainsOption, starredChains, alphabeticalChains } = groupChains(
      options,
      popularChainIds,
      starredChainIds
    )

    // Start with All Chains if available
    const shortcuts: ChainFilterValue[] = []

    if (allChainsOption) {
      shortcuts.push(allChainsOption)
    }

    // Add starred chains first (up to 4 more slots after All Chains)
    const remainingSlots = 5 - shortcuts.length // Allow for "All" + 4 chains
    const starredToAdd = starredChains.slice(0, remainingSlots)
    shortcuts.push(...starredToAdd)

    // Fill remaining slots with popular/alphabetical chains
    const currentSlots = shortcuts.length
    if (currentSlots < 5) {
      const remainingSlots = 5 - currentSlots
      const existingIds = new Set(shortcuts.map((c) => c.id))

      // Try to add popular chains first
      const popularChains = alphabeticalChains.filter(
        (chain) =>
          chain.id &&
          popularChainIds?.includes(chain.id) &&
          !existingIds.has(chain.id)
      )

      const popularToAdd = popularChains.slice(0, remainingSlots)
      shortcuts.push(...popularToAdd)

      // Fill any remaining slots with alphabetical chains
      const finalSlots = shortcuts.length
      if (finalSlots < 5) {
        const finalRemaining = 5 - finalSlots
        const finalExistingIds = new Set(shortcuts.map((c) => c.id))
        const alphabeticalToAdd = alphabeticalChains
          .filter((chain) => chain.id && !finalExistingIds.has(chain.id))
          .slice(0, finalRemaining)
        shortcuts.push(...alphabeticalToAdd)
      }
    }

    return shortcuts.slice(0, 5) // Show "All" + up to 4 chains + More button
  }, [options, popularChainIds, starredChainIds])

  const handleChainSelect = (chain: ChainFilterValue) => {
    onAnalyticEvent?.(EventNames.CURRENCY_STEP_CHAIN_FILTER, {
      chain: chain.name,
      chain_id: chain.id,
      search_term: '',
      context,
      from_starred_list: starredChainIds?.includes(chain.id as number) ?? false
    })

    onSelect(chain)
  }

  return (
    <Flex css={{ gap: '2', width: '100%', overflowX: 'auto', py: '2' }}>
      {shortcutChains.map((chain) => (
        <ChainShortcutButton
          key={chain.id?.toString() ?? 'all-chains'}
          chain={chain}
          isSelected={value.id === chain.id}
          onClick={() => handleChainSelect(chain)}
        />
      ))}

      <Button
        color="ghost"
        size="none"
        onClick={onMoreClick}
        css={{
          display: 'flex',
          alignItems: 'center',
          gap: '1',
          px: '2',
          py: '10px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: 'dropdown-background',
          color: 'gray9',
          _hover: {
            backgroundColor: 'gray3'
          }
        }}
      >
        <Text style="subtitle1" color="subtle">
          More
        </Text>
        <FontAwesomeIcon icon={faChevronRight} width={16} height={16} />
      </Button>
    </Flex>
  )
}

type ChainShortcutButtonProps = {
  chain: ChainFilterValue
  isSelected: boolean
  onClick: () => void
}

const ChainShortcutButton: FC<ChainShortcutButtonProps> = ({
  chain,
  isSelected,
  onClick
}) => {
  return (
    <Button
      color="ghost"
      size="none"
      onClick={onClick}
      css={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1',
        py: '2',
        px: '3',
        borderRadius: '12px',
        backgroundColor: isSelected ? 'gray6' : 'dropdown-background',
        _hover: {
          backgroundColor: isSelected ? 'gray6' : 'gray3'
        }
      }}
    >
      {chain.id ? (
        <ChainIcon
          chainId={chain.id}
          width={24}
          height={24}
          css={{ borderRadius: '4px', overflow: 'hidden' }}
        />
      ) : (
        <Text style="subtitle1" css={{ height: '24px', width: '20px' }}>
          All
        </Text>
      )}
    </Button>
  )
}
