import { FC, useEffect, useRef, useState } from 'react'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { useTokenList } from '@relayprotocol/relay-kit-hooks'
import {
  chainIcon,
  cx,
  isNativeToken,
  solverTokenKeys,
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
  /** Only offer the currencies the solver holds */
  solverOnly?: boolean
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
  solverOnly
}) => {
  const client = useRelayClient()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(false)
  const chains = (client?.chains ?? []).filter(
    (chain) =>
      chain.vmType === 'evm' &&
      (!solverOnly || solverTokenKeys(client?.chains, chain.id)?.length !== 0)
  )
  const solverTokens = solverOnly
    ? solverTokenKeys(client?.chains, value.chainId)
    : undefined
  const chainName = (id: number) =>
    chains.find((chain) => chain.id === id)?.displayName ?? `Chain ${id}`

  const { data: listedTokens } = useTokenList(
    client?.baseApiUrl,
    solverTokens
      ? { tokens: solverTokens, limit: solverTokens.length }
      : { chainIds: [value.chainId], verified: true, limit: 30 },
    {
      enabled:
        Boolean(client && value.chainId && (open || !value.address)) &&
        solverTokens?.length !== 0,
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
  const showAddressInput = !solverTokens && (custom || unlisted)

  useEffect(() => {
    if (!value.address && !custom && chainTokens?.[0]?.address) {
      onChange({ ...value, address: chainTokens[0].address })
    }
  }, [value, custom, chainTokens])

  useEffect(() => {
    if (!open) return
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
          <select
            aria-label={`${label} chain`}
            value={value.chainId}
            onChange={(e) => {
              setCustom(false)
              onChange({ chainId: Number(e.target.value), address: '' })
            }}
            className={css.select}
          >
            {!chains.some((chain) => chain.id === value.chainId) && (
              <option value={value.chainId}>{chainName(value.chainId)}</option>
            )}
            {chains.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.displayName} ({chain.id})
              </option>
            ))}
          </select>
          <div className={css.tokenList} role="listbox" aria-label="Tokens">
            {!chainTokens && <span className={css.hint}>Loading tokens…</span>}
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
          {solverTokens ? (
            unlisted && (
              <span className={css.error}>
                The solver doesn't hold this token on this chain. Pick one from
                the list.
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
                className={meta && !isNativeToken(value) ? css.hint : css.error}
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
      )}
    </div>
  )
}
