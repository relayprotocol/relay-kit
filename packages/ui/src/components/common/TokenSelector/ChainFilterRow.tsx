import {
  type FC,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  forwardRef
} from 'react'
import { Flex, Text, Input, Box, ChainIcon } from '../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faStar } from '@fortawesome/free-solid-svg-icons'
import type { ChainFilterValue } from './ChainFilter.js'
import AllChainsLogo from '../../../img/AllChainsLogo.js'
import { TagPill } from './TagPill.js'
import {
  isChainStarred,
  toggleStarredChain
} from '../../../utils/localStorage.js'
import { EventNames } from '../../../constants/events.js'

export type ChainFilterRowProps = {
  chain: ChainFilterValue
  tag?: string
  onToggleStar?: () => void
  showStar?: boolean
  onAnalyticEvent?: (eventName: string, data?: any) => void
  children?: ReactNode
}

export const ChainFilterRow: FC<ChainFilterRowProps> = ({
  chain,
  tag,
  onToggleStar,
  showStar = true,
  onAnalyticEvent,
  children
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isStarred = chain.id ? isChainStarred(chain.id) : false

  const handleClickOutside = useCallback((event: MouseEvent | TouchEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setDropdownOpen(false)
    }
  }, [])

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
        css={{
          gap: '2',
          cursor: 'pointer',
          flexShrink: 0,
          alignContent: 'center',
          width: '100%',
          position: 'relative',
          userSelect: 'none'
        }}
        style={{
          WebkitUserSelect: 'none'
        }}
      >
        <ChainIcon chainId={chain.id} square width={24} height={24} />
        <Text style="subtitle2">
          {('displayName' in chain && chain.displayName) || chain.name}
        </Text>
        {showStar && isStarred && (
          <Box css={{ color: 'primary9' }}>
            <FontAwesomeIcon icon={faStar} width={12} height={12} />
          </Box>
        )}
        {tag && <TagPill tag={tag} />}
        {children}
      </Flex>

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
    </div>
  )
}

export type ChainSearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const ChainSearchInput = forwardRef<
  HTMLInputElement,
  ChainSearchInputProps
>(({ value, onChange, placeholder = 'Search for a chain' }, ref) => (
  <Input
    ref={ref}
    placeholder={placeholder}
    icon={
      <Box css={{ color: 'gray9' }}>
        <FontAwesomeIcon icon={faMagnifyingGlass} width={16} height={16} />
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
    value={value}
    onChange={(e) => onChange((e.target as HTMLInputElement).value)}
    onKeyDown={(e) => e.stopPropagation()}
  />
))
