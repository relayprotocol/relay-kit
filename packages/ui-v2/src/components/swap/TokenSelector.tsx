import * as React from 'react'
import Fuse from 'fuse.js'
import { Search, X, AlertTriangle, ChevronLeft } from 'lucide-react'
import { formatUnits, isAddress } from 'viem'
import { cn } from '@/lib/utils.js'
import { useIsDarkMode } from '@/hooks/useIsDarkMode.js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton
} from '@/components/ui/dialog.js'
import { Skeleton } from '@/components/ui/skeleton.js'
import { ChainFilter } from './ChainFilter.js'
import { ChainTokenIcon } from './ChainTokenIcon.js'
import { AllChainsLogo } from './AllChainsLogo.js'
import { useRelayClient } from '@/hooks/useRelayClient.js'
import { useDuneBalances } from '@/hooks/useDuneBalances.js'
import { useStarredChains } from '@/hooks/useStarredChains.js'
import { EventNames } from '@/constants/events.js'
import { useTokenList, useRelayChains } from '@relayprotocol/relay-kit-hooks'
import { alreadyAcceptedToken, acceptUnverifiedToken } from '@/lib/localStorage.js'
import type { Token } from '@/types/token.js'
import type { DuneBalance } from '@/hooks/useDuneBalances.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'

const ASSETS_RELAY_API = 'https://assets.relay.link'

/** Number of chain icons shown in the mobile shortcut row before "More" */
const MOBILE_SHORTCUT_COUNT = 5

/** Returns the light/dark square-format icon URL for a chain in mobile shortcuts. */
function squareChainIcon(chain: RelayChain, mode: 'light' | 'dark'): string {
  return `${ASSETS_RELAY_API}/icons/square/${chain.id}/${mode}.png`
}

/** Maps a raw API currency object to the internal Token type. */
function currencyToToken(c: Record<string, unknown>): Token {
  const id = c.id as string | undefined
  const symbol = (c.symbol as string | undefined)?.toLowerCase()
  const chainId = c.chainId as number
  const metadata = c.metadata as Record<string, unknown> | undefined
  return {
    chainId,
    address: (c.address as string) ?? '',
    name: (c.name as string) ?? '',
    symbol: (c.symbol as string) ?? '',
    decimals: (c.decimals as number) ?? 18,
    logoURI:
      (metadata?.logoURI as string | undefined) ||
      (c.logoURI as string | undefined) ||
      `${ASSETS_RELAY_API}/icons/currencies/${id ?? symbol ?? String(chainId)}.png`,
    verified:
      (metadata?.verified as boolean | undefined) ??
      (c.verified as boolean | undefined) ??
      false
  }
}

/** Maps a featuredToken (from RelayChain) to Token — always verified. */
function featuredToToken(ft: Record<string, unknown>, chainId: number): Token {
  const id = ft.id as string | undefined
  const symbol = (ft.symbol as string | undefined)?.toLowerCase()
  const metadata = ft.metadata as Record<string, unknown> | undefined
  return {
    chainId,
    address: (ft.address as string) ?? '',
    name: (ft.name as string) ?? '',
    symbol: (ft.symbol as string) ?? '',
    decimals: (ft.decimals as number) ?? 18,
    logoURI:
      (metadata?.logoURI as string | undefined) ||
      `${ASSETS_RELAY_API}/icons/currencies/${id ?? symbol ?? String(chainId)}.png`,
    verified: true
  }
}

/** Maps a Dune balance entry to a Token (treated as verified since user owns it). */
function duneBalanceToToken(b: DuneBalance): Token {
  return {
    chainId: b.chain_id,
    address: b.address,
    name: b.symbol,
    symbol: b.symbol,
    decimals: b.decimals,
    logoURI: `${ASSETS_RELAY_API}/icons/currencies/${b.symbol.toLowerCase()}.png`,
    verified: true
  }
}

interface TokenSelectorProps {
  open: boolean
  onClose: () => void
  /** Which side is being selected — for analytics context */
  side: 'from' | 'to'
  onSelectToken: (token: Token) => void
  /** The currently selected token for this side */
  selectedToken?: Token
  /** User's wallet address for Dune balance lookup */
  address?: string
  onAnalyticEvent?: (eventName: string, data?: Record<string, unknown>) => void
}

/**
 * Full-screen token search and selection dialog.
 *
 * Mobile: bottom sheet with horizontal chain shortcut row (icon pills, no labels).
 *   "All" shown as a text pill. Tapping "More" switches to a full chain list view.
 * Desktop (sm+): centered modal with a chain filter sidebar on the left.
 *
 * Features:
 * - Dune balance integration: shows "Your Tokens" sorted by USD value.
 * - Fuzzy search via fuse.js; address search supported.
 * - Featured token pills when a specific chain is selected.
 * - Unverified-token warning modal (accepted state persisted to localStorage).
 * - Loading skeletons while tokens are fetching.
 * - Auto-focuses search input on open and when chain is selected.
 * - Keyboard: ArrowDown in search → first token row; ArrowUp from first → back to search.
 *   Tab from last chain filter item → token search.
 */
export const TokenSelector: React.FC<TokenSelectorProps> = ({
  open,
  onClose,
  side,
  onSelectToken,
  selectedToken,
  address,
  onAnalyticEvent
}) => {
  const relayClient = useRelayClient()
  const colorMode = useIsDarkMode()
  const [search, setSearch] = React.useState('')
  const [selectedChain, setSelectedChain] = React.useState<RelayChain | undefined>(undefined)
  const [focusedIndex, setFocusedIndex] = React.useState(0)
  const [unverifiedPendingToken, setUnverifiedPendingToken] = React.useState<Token | null>(null)
  /** Mobile only: 'tokens' = shortcut row + list, 'chains' = full chain list */
  const [mobileView, setMobileView] = React.useState<'tokens' | 'chains'>('tokens')
  const searchRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const firstTokenRowRef = React.useRef<HTMLDivElement>(null)

  // Data sources
  const { chains = [] } = useRelayChains(relayClient?.baseApiUrl)
  const { starredChainIds, isStarred } = useStarredChains()
  const { balanceMap } = useDuneBalances(address)

  const { data: tokenListData, isLoading: isLoadingTokens } = useTokenList(
    relayClient?.baseApiUrl,
    {
      chainIds: selectedChain ? [selectedChain.id] : undefined,
      limit: 50,
      defaultList: true
    },
    { enabled: !!relayClient }
  ) as { data: unknown; isLoading: boolean }

  // Mobile chain shortcuts: starred chains first, then others, up to MOBILE_SHORTCUT_COUNT
  const mobileShortcutChains = React.useMemo(() => {
    const starred = chains.filter((c) => isStarred(c.id))
    const others = chains.filter((c) => !isStarred(c.id))
    return [...starred, ...others].slice(0, MOBILE_SHORTCUT_COUNT)
  }, [chains, isStarred, starredChainIds])

  const allTokens = React.useMemo<Token[]>(() => {
    if (!tokenListData || !Array.isArray(tokenListData)) return []
    return (tokenListData as Record<string, unknown>[]).map(currencyToToken)
  }, [tokenListData])

  const featuredTokens = React.useMemo<Token[]>(() => {
    if (!selectedChain?.featuredTokens) return []
    return (selectedChain.featuredTokens as Record<string, unknown>[]).map((ft) =>
      featuredToToken(ft, selectedChain.id)
    )
  }, [selectedChain])

  /** User's tokens from Dune, sorted by USD value descending. */
  const userTokenEntries = React.useMemo<Array<{ token: Token; balance: DuneBalance }>>(() => {
    if (!address || Object.keys(balanceMap).length === 0) return []

    const entries = Object.values(balanceMap)
      .filter((b) => {
        if (!b.chain_id) return false
        if (selectedChain && b.chain_id !== selectedChain.id) return false
        if (search) {
          const q = search.toLowerCase()
          return b.symbol.toLowerCase().includes(q) || b.address.toLowerCase().includes(q)
        }
        return true
      })
      .sort((a, b) => (b.value_usd ?? 0) - (a.value_usd ?? 0))

    return entries.map((b) => ({ token: duneBalanceToToken(b), balance: b }))
  }, [balanceMap, selectedChain, search, address])

  const fuse = React.useMemo(
    () =>
      new Fuse(allTokens, {
        keys: ['name', 'symbol', 'address'],
        threshold: 0.3,
        distance: 100
      }),
    [allTokens]
  )

  const filteredTokens = React.useMemo(() => {
    if (!search) return allTokens

    if (isAddress(search)) {
      onAnalyticEvent?.(EventNames.TOKEN_SELECTOR_CONTRACT_SEARCH, {
        address: search,
        chain_id: selectedChain?.id
      })
    }

    return fuse.search(search).map((r) => r.item)
  }, [search, fuse, allTokens, selectedChain, onAnalyticEvent])

  // Auto-focus search on open; reset state
  React.useEffect(() => {
    if (open) {
      onAnalyticEvent?.(EventNames.SWAP_START_TOKEN_SELECT, { side })
      setSearch('')
      setFocusedIndex(0)
      setMobileView('tokens')
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open, side, onAnalyticEvent])

  /**
   * Common handler for chain selection from both desktop sidebar and mobile UI.
   * Auto-focuses search input after selection.
   */
  const handleChainSelect = (chain?: RelayChain) => {
    setSelectedChain(chain)
    setSearch('')
    setMobileView('tokens')
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  /** Mobile-only: select chain + fire analytics (ChainFilter fires its own for desktop) */
  const handleMobileChainSelect = (chain?: RelayChain) => {
    handleChainSelect(chain)
    onAnalyticEvent?.(EventNames.CURRENCY_STEP_CHAIN_FILTER, {
      chain_id: chain?.id,
      chain_name: chain?.displayName
    })
  }

  const handleClose = () => {
    onAnalyticEvent?.(EventNames.SWAP_EXIT_TOKEN_SELECT, { side })
    onClose()
  }

  const handleSelectToken = (token: Token) => {
    if (!token.verified && !alreadyAcceptedToken(token)) {
      setUnverifiedPendingToken(token)
      return
    }
    commitSelectToken(token)
  }

  const commitSelectToken = (token: Token) => {
    onAnalyticEvent?.(EventNames.SWAP_TOKEN_SELECT, {
      side,
      symbol: token.symbol,
      address: token.address,
      chain_id: token.chainId
    })
    onSelectToken(token)
    onClose()
  }

  const handleAcceptUnverified = () => {
    if (!unverifiedPendingToken) return
    acceptUnverifiedToken(unverifiedPendingToken)
    commitSelectToken(unverifiedPendingToken)
    setUnverifiedPendingToken(null)
  }

  const handleRejectUnverified = () => {
    setUnverifiedPendingToken(null)
  }

  /** Focus first token row (called from search ArrowDown) */
  const focusFirstToken = () => {
    setFocusedIndex(0)
    firstTokenRowRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (document.activeElement === searchRef.current) {
          // ArrowDown from search → focus first token
          focusFirstToken()
        } else {
          setFocusedIndex((i) => Math.min(i + 1, filteredTokens.length - 1))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (focusedIndex <= 0) {
          // ArrowUp from first token → back to search
          searchRef.current?.focus()
        } else {
          setFocusedIndex((i) => Math.max(i - 1, 0))
        }
        break
      case 'Enter':
        if (filteredTokens[focusedIndex]) {
          handleSelectToken(filteredTokens[focusedIndex])
        }
        break
      case 'Escape':
        handleClose()
        break
      default:
        if (e.key.length === 1 && document.activeElement !== searchRef.current) {
          searchRef.current?.focus()
        }
    }
  }

  const isSelected = (token: Token) =>
    token.address === selectedToken?.address && token.chainId === selectedToken?.chainId

  const renderTokenRow = (
    token: Token,
    i: number,
    idPrefix = 'token-option',
    rightContent?: React.ReactNode
  ) => (
    <div
      key={`${token.chainId}-${token.address}`}
      id={`${idPrefix}-${i}`}
      ref={i === 0 ? firstTokenRowRef : undefined}
      role="option"
      aria-selected={isSelected(token)}
      tabIndex={focusedIndex === i ? 0 : -1}
      onFocus={() => setFocusedIndex(i)}
      onClick={() => handleSelectToken(token)}
      onKeyDown={(e) => { if (e.key === 'Enter') handleSelectToken(token) }}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-3 min-h-[56px]',
        'cursor-pointer transition-colors duration-100',
        'hover:bg-accent focus:bg-accent focus:outline-none',
        focusedIndex === i && 'bg-accent',
        isSelected(token) && 'bg-primary/10'
      )}
    >
      <ChainTokenIcon
        tokenLogoURI={token.logoURI}
        tokenSymbol={token.symbol}
        chainId={token.chainId}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate">{token.symbol}</span>
          {!token.verified && (
            <AlertTriangle
              className="h-3.5 w-3.5 text-muted-foreground shrink-0"
              aria-label="Unverified token"
            />
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">{token.name}</div>
      </div>
      {rightContent}
    </div>
  )

  const renderSkeletons = () =>
    Array.from({ length: 5 }, (_, i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-3 min-h-[56px]">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    ))

  const renderSectionLabel = (label: string) => (
    <div className="px-3 pt-3 pb-1 shrink-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent asBottomSheet className="flex flex-col">
          <DialogHeader className="relative shrink-0">
            <DialogTitle>Select token</DialogTitle>
            <DialogCloseButton />
          </DialogHeader>

          {/* ── Mobile: Full chain list view ────────────────────────────────── */}
          <div
            className={cn(
              'flex-col flex-1 min-h-0 sm:hidden',
              mobileView === 'chains' ? 'flex' : 'hidden'
            )}
          >
            <div className="px-4 pt-2 pb-1 shrink-0">
              <button
                type="button"
                onClick={() => setMobileView('tokens')}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
            </div>
            <div className="flex-1 min-h-0 px-2 pb-4">
              <ChainFilter
                chains={chains as RelayChain[]}
                selectedChain={selectedChain}
                onSelectChain={handleMobileChainSelect}
                onAnalyticEvent={onAnalyticEvent}
                className="h-full"
              />
            </div>
          </div>

          {/* ── Main tokens view ─────────────────────────────────────────────── */}
          <div
            className={cn(
              'flex-col flex-1 min-h-0',
              mobileView === 'tokens' ? 'flex' : 'hidden sm:flex'
            )}
          >
            {/* Mobile: Horizontal chain shortcut row — icon-only pill strip */}
            <div className="flex sm:hidden items-center gap-2 px-3 py-2 overflow-x-auto shrink-0">
              {/* "All" text pill */}
              <button
                type="button"
                onClick={() => handleMobileChainSelect(undefined)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors duration-100',
                  !selectedChain
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50'
                )}
              >
                All
              </button>

              {/* Chain icon buttons — no label, neutral selected state */}
              {mobileShortcutChains.map((chain) => (
                <button
                  key={chain.id}
                  type="button"
                  onClick={() => handleMobileChainSelect(chain)}
                  aria-label={chain.displayName}
                  className={cn(
                    'h-9 w-9 rounded-full overflow-hidden shrink-0 transition-all duration-100',
                    selectedChain?.id === chain.id
                      ? 'ring-2 ring-muted-foreground/50 bg-accent/50'
                      : 'opacity-70 hover:opacity-100'
                  )}
                >
                  <img
                    src={squareChainIcon(chain, colorMode)}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover bg-muted"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </button>
              ))}

              {/* More button — shows full chain list */}
              {chains.length > MOBILE_SHORTCUT_COUNT && (
                <button
                  type="button"
                  onClick={() => setMobileView('chains')}
                  aria-label="More chains"
                  className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 hover:bg-accent transition-colors"
                >
                  <span className="text-sm font-bold text-muted-foreground leading-none">···</span>
                </button>
              )}
            </div>

            {/* Body: chain sidebar (desktop) + token list column */}
            <div className="flex flex-1 min-h-0">
              {/* Desktop chain filter sidebar */}
              <ChainFilter
                chains={chains as RelayChain[]}
                selectedChain={selectedChain}
                onSelectChain={handleChainSelect}
                onAnalyticEvent={onAnalyticEvent}
                onTabOut={() => searchRef.current?.focus()}
                className="hidden sm:flex w-44 shrink-0 border-r border-border px-2 pt-3"
              />

              {/* Token list column */}
              <div className="flex flex-col flex-1 min-h-0">
                {/* Search input — scoped to token list column width */}
                <div className="px-4 pt-3 pb-2 shrink-0">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setFocusedIndex(0)
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Search tokens or paste address"
                      aria-label="Search tokens"
                      autoComplete="off"
                      className={cn(
                        'w-full rounded-lg border border-border bg-muted/50',
                        'pl-9 pr-4 py-3 text-sm',
                        'focus:outline-none focus:ring-2 focus:ring-ring',
                        'placeholder:text-muted-foreground',
                        'min-h-[44px]'
                      )}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        aria-label="Clear search"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Featured token pills — only when a specific chain is selected and no search */}
                {selectedChain && featuredTokens.length > 0 && !search && (
                  <div className="flex flex-wrap gap-2 px-4 pb-3 shrink-0">
                    {featuredTokens.map((token) => (
                      <button
                        key={`${token.chainId}-${token.address}`}
                        type="button"
                        onClick={() => handleSelectToken(token)}
                        className={cn(
                          'flex items-center gap-2 rounded-full border border-border',
                          'px-3 py-2 text-sm font-medium transition-colors duration-100',
                          'hover:bg-accent hover:border-primary/30',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isSelected(token) && 'bg-primary/10 border-primary/30 text-primary'
                        )}
                      >
                        {token.logoURI && (
                          <img
                            src={token.logoURI}
                            alt=""
                            aria-hidden="true"
                            className="h-5 w-5 rounded-full bg-muted"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        )}
                        {token.symbol}
                      </button>
                    ))}
                  </div>
                )}

                {/* Token list */}
                <div
                  ref={listRef}
                  role="listbox"
                  aria-label="Select a token"
                  aria-activedescendant={
                    filteredTokens[focusedIndex]
                      ? `token-option-${focusedIndex}`
                      : undefined
                  }
                  className="flex-1 overflow-y-auto overscroll-contain px-2 pb-4"
                  onKeyDown={handleKeyDown}
                >
                  {isLoadingTokens ? (
                    renderSkeletons()
                  ) : (
                    <>
                      {/* Your Tokens section (Dune balances, when no search) */}
                      {userTokenEntries.length > 0 && !search && (
                        <>
                          {renderSectionLabel('Your Tokens')}
                          {userTokenEntries.map(({ token, balance }, i) =>
                            renderTokenRow(
                              token,
                              i,
                              'user-token',
                              balance.value_usd !== undefined ? (
                                <div className="text-right shrink-0">
                                  <div className="text-xs font-medium text-foreground">
                                    ${balance.value_usd.toFixed(2)}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {formatUnits(BigInt(balance.amount), balance.decimals).slice(0, 8)}{' '}
                                    {balance.symbol}
                                  </div>
                                </div>
                              ) : null
                            )
                          )}
                          {renderSectionLabel('All Tokens')}
                        </>
                      )}

                      {/* All tokens list */}
                      {filteredTokens.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                          <p>No tokens found</p>
                          {search && (
                            <p className="mt-1 text-xs">
                              Try a different search or paste a contract address
                            </p>
                          )}
                        </div>
                      ) : (
                        filteredTokens.map((token, i) => renderTokenRow(token, i))
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unverified token warning modal */}
      {unverifiedPendingToken && (
        <Dialog open={true} onOpenChange={(isOpen) => !isOpen && handleRejectUnverified()}>
          <DialogContent className="max-w-[360px] w-full p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" aria-hidden="true" />
                <DialogTitle>Unverified Token</DialogTitle>
              </div>
            </DialogHeader>
            <div className="px-6 py-4 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">{unverifiedPendingToken.symbol}</strong> is
                not on Relay&apos;s verified token list. Unverified tokens may be fake or
                otherwise fraudulent.
              </p>
              <p className="mt-2">
                Make sure you know and trust this token before proceeding.
              </p>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                type="button"
                onClick={handleRejectUnverified}
                className={cn(
                  'flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium',
                  'hover:bg-accent transition-colors duration-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptUnverified}
                className={cn(
                  'flex-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white',
                  'hover:bg-amber-600 transition-colors duration-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'
                )}
              >
                I understand, continue
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
