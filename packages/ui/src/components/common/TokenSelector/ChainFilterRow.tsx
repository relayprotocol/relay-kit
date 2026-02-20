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
import { cn } from '../../../utils/cn.js'

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
        {children}
      </Flex>

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
    </div>
  )
}

export type ChainSearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

export const ChainSearchInput = forwardRef<
  HTMLInputElement,
  ChainSearchInputProps
>(({ value, onChange, placeholder = 'Search for a chain', onKeyDown }, ref) => (
  <Input
    ref={ref}
    placeholder={placeholder}
    icon={
      <Box className="relay-text-[color:var(--relay-colors-gray9)]">
        <FontAwesomeIcon icon={faMagnifyingGlass} width={16} height={16} />
      </Box>
    }
    containerClassName="relay-w-full relay-h-[40px] relay-mb-2"
    className="relay-w-full relay-border relay-border-solid relay-border-[var(--relay-colors-subtle-border-color)] relay-bg-[var(--relay-colors-modal-background)] [&::placeholder]:relay-text-ellipsis"
    value={value}
    onChange={(e) => onChange((e.target as HTMLInputElement).value)}
    onKeyDown={onKeyDown}
  />
))
