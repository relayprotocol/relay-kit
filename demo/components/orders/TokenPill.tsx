import { FC, useEffect, useRef, useState } from 'react'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { useTokenList } from '@relayprotocol/relay-kit-hooks'
import {
  chainIcon,
  cx,
  isNativeToken,
  solverTokenKeys,
  useSolverChains,
  type TokenMeta,
  type TokenRef
} from './common'
import css from './orders.module.css'

type Props = {
  label: string
  value: TokenRef
  onChange: (token: TokenRef) => void
  meta?: TokenMeta
  metaLoading: boolean
  /** Only offer the currencies the solver holds, or only its accepted settlement stablecoins */
  currencies?: 'solver' | 'settlement'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const TokenLogo: FC<{ meta?: TokenMeta; chainId: number }> = ({
  meta,
  chainId
}) => (
  <span className={css.logoWrap}>
    {meta?.logoURI ? (
      <img src={meta.logoURI} alt="" className={css.tokenLogo} />
    ) : (
      <span className={cx(css.tokenLogo, css.logoFallback)}>
        {meta?.symbol?.[0] ?? '?'}
      </span>
    )}
    <img src={chainIcon(chainId)} alt="" className={css.chainBadge} />
  </span>
)

export const TokenPill: FC<Props> = ({
  label,
  value,
  onChange,
  meta,
  metaLoading,
  currencies,
  open,
  onOpenChange: setOpen
}) => {
  const client = useRelayClient()
  const ref = useRef<HTMLDivElement>(null)
  const [custom, setCustom] = useState(false)
  const [chainSearch, setChainSearch] = useState('')
  const solverChains = useSolverChains()
  const solverOnly = Boolean(currencies)
  const settlement = currencies === 'settlement'
  const chains = (client?.chains ?? [])
    .filter(
      (chain) =>
        chain.vmType === 'evm' &&
        (!solverOnly ||
          (solverChains &&
            solverTokenKeys(solverChains, chain.id, { settlement }).length > 0))
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
  const search = chainSearch.trim().toLowerCase()
  const shownChains = search
    ? chains.filter(
        (chain) =>
          chain.displayName.toLowerCase().includes(search) ||
          chain.name.toLowerCase().includes(search) ||
          String(chain.id) === search
      )
    : chains
  const solverTokens =
    solverOnly && solverChains
      ? solverTokenKeys(solverChains, value.chainId, { settlement })
      : undefined
  const chainName = (id: number) =>
    chains.find((chain) => chain.id === id)?.displayName ?? `Chain ${id}`

  const { data: listedTokens } = useTokenList(
    client?.baseApiUrl,
    solverOnly
      ? { tokens: solverTokens ?? [], limit: solverTokens?.length ?? 0 }
      : { chainIds: [value.chainId], verified: true, limit: 30 },
    {
      enabled:
        Boolean(
          client && value.chainId && (open || !value.address || settlement)
        ) &&
        (!solverOnly || Boolean(solverTokens?.length)),
      staleTime: Infinity
    }
  )
  const chainTokens = listedTokens?.filter(
    (token) =>
      !isNativeToken({ chainId: value.chainId, address: token.address ?? '' })
  )
  const address = value.address.toLowerCase()
  const listed = chainTokens?.some(
    (token) => token.address?.toLowerCase() === address
  )
  const unlisted = Boolean(chainTokens) && Boolean(value.address) && !listed
  const showAddressInput = !solverOnly && (custom || unlisted)

  useEffect(() => {
    if (
      (!value.address || (settlement && unlisted)) &&
      !custom &&
      chainTokens?.[0]?.address
    ) {
      onChange({ ...value, address: chainTokens[0].address })
    }
  }, [value, custom, chainTokens, settlement, unlisted])

  useEffect(() => {
    if (!open) {
      setChainSearch('')
      return
    }
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !ref.current?.contains(event.target as Node)
      )
        setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className={css.pillWrap} ref={ref}>
      <button
        className={css.pill}
        aria-label={`${label} token`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <TokenLogo meta={meta} chainId={value.chainId} />
        <span className={css.pillText}>
          <b>{meta?.symbol ?? (metaLoading ? 'Loading…' : 'Select token')}</b>
          <span>{chainName(value.chainId)}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          className={css.popover}
          role="dialog"
          aria-label={`${label} token`}
        >
          <div className={css.chainColumn}>
            <input
              aria-label={`Search ${label.toLowerCase()} chains`}
              value={chainSearch}
              onChange={(e) => setChainSearch(e.target.value)}
              placeholder="Search chains"
              autoFocus
              className={css.input}
            />
            <div
              className={css.chainList}
              role="listbox"
              aria-label={`${label} chain`}
            >
              {shownChains.length === 0 && (
                <span className={css.hint}>No chains match.</span>
              )}
              {shownChains.map((chain) => {
                const selected = chain.id === value.chainId
                return (
                  <button
                    key={chain.id}
                    role="option"
                    aria-selected={selected}
                    className={cx(css.chainRow, selected && css.tokenRowActive)}
                    onClick={() => {
                      if (selected) return
                      setCustom(false)
                      onChange({ chainId: chain.id, address: '' })
                    }}
                  >
                    <img src={chainIcon(chain.id)} alt="" />
                    {chain.displayName}
                  </button>
                )
              })}
            </div>
          </div>
          <div className={css.tokenColumn}>
            <div className={css.tokenList} role="listbox" aria-label="Tokens">
              {!chainTokens && (
                <span className={css.hint}>
                  {solverOnly && solverTokens?.length === 0
                    ? settlement
                      ? 'The solver holds no accepted stablecoin on this chain.'
                      : 'The solver holds no tokens on this chain.'
                    : 'Loading tokens…'}
                </span>
              )}
              {chainTokens?.map((token) => {
                const tokenAddress = token.address?.toLowerCase() ?? ''
                const selected = !showAddressInput && tokenAddress === address
                return (
                  <button
                    key={tokenAddress}
                    role="option"
                    aria-selected={selected}
                    className={cx(css.tokenRow, selected && css.tokenRowActive)}
                    onClick={() => {
                      setCustom(false)
                      onChange({ ...value, address: token.address! })
                      setOpen(false)
                    }}
                  >
                    <TokenLogo
                      meta={{
                        chainId: value.chainId,
                        address: tokenAddress,
                        symbol: token.symbol,
                        logoURI: token.metadata?.logoURI
                      }}
                      chainId={value.chainId}
                    />
                    <span className={css.tokenRowText}>
                      <b>{token.symbol}</b>
                      <span className={css.hint}>{token.name}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            {solverOnly ? (
              unlisted && (
                <span className={css.error}>
                  The solver doesn't hold this token on this chain. Pick one
                  from the list.
                </span>
              )
            ) : (
              <button
                aria-pressed={showAddressInput}
                className={cx(
                  css.tokenRow,
                  showAddressInput && css.tokenRowActive
                )}
                onClick={() => setCustom(true)}
              >
                <span className={cx(css.tokenLogo, css.logoFallback)}>+</span>
                <span className={css.tokenRowText}>
                  <b>Enter address…</b>
                  <span className={css.hint}>Any token on currencies/v2</span>
                </span>
              </button>
            )}
            {showAddressInput && (
              <>
                <input
                  aria-label={`${label} address`}
                  value={value.address}
                  onChange={(e) =>
                    onChange({ ...value, address: e.target.value.trim() })
                  }
                  placeholder="0x… token address"
                  autoFocus={custom}
                  className={cx(css.input, css.mono)}
                />
                <span
                  className={
                    meta && !isNativeToken(value) ? css.hint : css.error
                  }
                >
                  {isNativeToken(value)
                    ? 'Native currencies are not supported. Use the wrapped token, such as WETH.'
                    : meta
                      ? `${meta.symbol} · ${meta.decimals} decimals${meta.verified ? '' : ' · unverified'}`
                      : metaLoading || !value.address
                        ? 'Looking up token…'
                        : 'Not found on currencies/v2. Check the chain and address.'}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
