import { FC, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CreateOrderBody,
  Order,
  OrderSponsoredFeeComponent
} from '@relayprotocol/relay-sdk'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import {
  erc20Abi,
  formatUnits,
  parseUnits,
  type Address,
  type WalletClient
} from 'viem'
import { useReadContract } from 'wagmi'
import type { RunAction } from './ActivityLog'
import {
  cx,
  formatNumber,
  isNativeToken,
  Json,
  toDecimalString,
  tokenKey,
  useTokensMeta,
  useUsdPrice,
  type TokenRef
} from './common'
import { TokenLogo, TokenPill } from './TokenPill'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import css from './orders.module.css'

const EXPIRY_PRESETS = {
  '15m': { label: '15 min', ms: 16 * 60_000 },
  '1h': { label: '1 hour', ms: 60 * 60_000 },
  '1d': { label: '1 day', ms: 24 * 60 * 60_000 },
  '3d': { label: '3 days', ms: 3 * 24 * 60 * 60_000 },
  '7d': { label: '1 week', ms: 7 * 24 * 60 * 60_000 - 60_000 }
} as const
type ExpiryPreset = keyof typeof EXPIRY_PRESETS | 'custom'

const PRICE_STEPS = [0.01, 0.05, 0.1]

const SPONSORED_COMPONENTS: OrderSponsoredFeeComponent[] = [
  'execution',
  'swap',
  'relay',
  'app',
  'rent'
]

const isAddress = (value: string): value is Address =>
  /^0x[0-9a-fA-F]{40}$/.test(value)

export type OrderDraft = { key: number; order: Order }

type Props = {
  wallet?: WalletClient
  address?: string
  run: RunAction
  onOrder: (order?: Order) => void
  draft?: OrderDraft
}

/** On-chain ERC-20 balance of the token being spent, read through wagmi */
function useSpendBalance(token: TokenRef, user: string) {
  return useReadContract({
    address: token.address as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [user as Address],
    chainId: token.chainId,
    query: { enabled: isAddress(user) && isAddress(token.address) }
  }).data
}

export const CreateOrderForm: FC<Props> = ({
  wallet,
  address,
  run,
  onOrder,
  draft
}) => {
  const client = useRelayClient()
  const { setShowAuthFlow } = useDynamicContext()
  const [side, setSide] = useState<'buy' | 'sell'>('sell')
  const [target, setTarget] = useState<TokenRef>({
    chainId: 8453,
    address: '0x4200000000000000000000000000000000000006'
  })
  const [settlement, setSettlement] = useState<TokenRef>({
    chainId: 8453,
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
  })
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [draftBaseAmount, setDraftBaseAmount] = useState<string>()
  const [expiry, setExpiry] = useState<ExpiryPreset>('1d')
  const [customExpiry, setCustomExpiry] = useState('')
  const [user, setUser] = useState('')
  const [recipient, setRecipient] = useState('')
  const [refundTo, setRefundTo] = useState('')
  const [clientOrderId, setClientOrderId] = useState('')
  const [newKeyEachSubmit, setNewKeyEachSubmit] = useState(true)
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [appFees, setAppFees] = useState<{ recipient: string; fee: string }[]>(
    []
  )
  const [subsidizeFees, setSubsidizeFees] = useState(false)
  const [sponsored, setSponsored] = useState<OrderSponsoredFeeComponent[]>([])
  const [maxSubsidizationAmount, setMaxSubsidizationAmount] = useState('')
  const [subsidizationBps, setSubsidizationBps] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const lastSubmit = useRef<
    { key: string; fields: string; expiresAt: string } | undefined
  >(undefined)

  useEffect(() => setIdempotencyKey(crypto.randomUUID()), [])

  useEffect(() => {
    if (!draft) return
    const { order } = draft
    setSide(order.side)
    setTarget({ chainId: order.targetChainId, address: order.targetCurrency })
    setSettlement({
      chainId: order.settlementChainId,
      address: order.settlementCurrency
    })
    setPrice(order.targetPrice)
    setDraftBaseAmount(order.amount)
    setUser(order.user)
    setRecipient(
      order.recipient && order.recipient !== order.user ? order.recipient : ''
    )
    setRefundTo(
      order.refundTo && order.refundTo !== order.user ? order.refundTo : ''
    )
    setAppFees(order.appFees ?? [])
    setSubsidizeFees(Boolean(order.subsidizeFees))
    setSponsored(order.sponsoredFeeComponents ?? [])
    setMaxSubsidizationAmount(order.maxSubsidizationAmount ?? '')
    setSubsidizationBps(order.subsidizationBps?.toString() ?? '')
    setClientOrderId('')
    setExpiry('1d')
  }, [draft])

  const owner = user || address || ''
  const spent = side === 'sell' ? target : settlement
  const tokens = useMemo(() => [target, settlement], [target, settlement])
  const { meta, isFetching } = useTokensMeta(tokens)
  const targetMeta = meta[tokenKey(target)]
  const settlementMeta = meta[tokenKey(settlement)]
  const spentMeta = side === 'sell' ? targetMeta : settlementMeta
  const targetUsd = useUsdPrice(target)
  const settlementUsd = useUsdPrice(settlement)
  const balance = useSpendBalance(spent, owner)

  useEffect(() => {
    if (draftBaseAmount === undefined || spentMeta?.decimals === undefined)
      return
    setAmount(formatUnits(BigInt(draftBaseAmount), spentMeta.decimals))
    setDraftBaseAmount(undefined)
  }, [draftBaseAmount, spentMeta?.decimals])

  const amountBase = useMemo(() => {
    if (!amount || spentMeta?.decimals === undefined) return undefined
    try {
      return parseUnits(amount, spentMeta.decimals).toString()
    } catch {
      return undefined
    }
  }, [amount, spentMeta?.decimals])

  const priceNumber = Number(price)
  const amountNumber = Number(amount)
  const hasPrice = price !== '' && priceNumber > 0
  const vsMarket =
    hasPrice && targetUsd ? (priceNumber / targetUsd - 1) * 100 : undefined
  const direction = side === 'sell' ? 1 : -1

  const expiresAt = (now = Date.now()) =>
    expiry === 'custom'
      ? customExpiry
        ? new Date(customExpiry).toISOString()
        : ''
      : new Date(now + EXPIRY_PRESETS[expiry].ms).toISOString()

  const body: CreateOrderBody = {
    type: 'limit',
    user: owner,
    ...(recipient ? { recipient } : {}),
    ...(refundTo ? { refundTo } : {}),
    side,
    targetCurrency: target.address,
    targetChainId: target.chainId,
    settlementCurrency: settlement.address,
    settlementChainId: settlement.chainId,
    targetPrice: price,
    amount: amountBase ?? '',
    expiresAt: expiresAt(),
    ...(appFees.length ? { appFees } : {}),
    ...(subsidizeFees ? { subsidizeFees } : {}),
    ...(sponsored.length ? { sponsoredFeeComponents: sponsored } : {}),
    ...(maxSubsidizationAmount ? { maxSubsidizationAmount } : {}),
    ...(subsidizationBps ? { subsidizationBps: Number(subsidizationBps) } : {}),
    ...(clientOrderId ? { clientOrderId } : {})
  }

  const submit = async () => {
    const key = newKeyEachSubmit ? crypto.randomUUID() : idempotencyKey
    const fields = JSON.stringify({
      ...body,
      expiresAt: expiry === 'custom' ? body.expiresAt : expiry
    })
    const retry =
      lastSubmit.current?.key === key && lastSubmit.current.fields === fields
    const order = {
      ...body,
      expiresAt: retry ? lastSubmit.current!.expiresAt : expiresAt()
    }
    lastSubmit.current = { key, fields, expiresAt: order.expiresAt }
    setIdempotencyKey(key)
    setSubmitting(true)
    const created = await run(
      'createOrder',
      { order, idempotencyKey: key, wallet: 'connected wallet' },
      (onProgress) =>
        client!.actions.createOrder({
          order,
          idempotencyKey: key,
          wallet,
          onProgress
        })
    )
    setSubmitting(false)
    onOrder(created)
  }

  const spentSymbol = spentMeta?.symbol ?? 'tokens'
  const targetSymbol = targetMeta?.symbol ?? 'target'
  const settlementSymbol = settlementMeta?.symbol ?? 'settlement'
  const chainName = (id: number) =>
    client?.chains.find((chain) => chain.id === id)?.displayName ?? `${id}`

  const amountValid = amountNumber > 0
  const orderValueUsd = amountValid
    ? side === 'sell'
      ? hasPrice
        ? amountNumber * priceNumber
        : undefined
      : settlementUsd
        ? amountNumber * settlementUsd
        : undefined
    : undefined
  const receiveEstimate =
    hasPrice && orderValueUsd !== undefined
      ? side === 'sell'
        ? settlementUsd
          ? orderValueUsd / settlementUsd
          : undefined
        : orderValueUsd / priceNumber
      : undefined
  const expiryDate = body.expiresAt ? new Date(body.expiresAt) : undefined

  const sellToken = side === 'sell' ? target : settlement
  const buyToken = side === 'sell' ? settlement : target
  const setSellToken = side === 'sell' ? setTarget : setSettlement
  const setBuyToken = side === 'sell' ? setSettlement : setTarget
  const sellMeta = side === 'sell' ? targetMeta : settlementMeta
  const buyMeta = side === 'sell' ? settlementMeta : targetMeta
  const sellUsd = side === 'sell' ? targetUsd : settlementUsd
  const buyUsd = side === 'sell' ? settlementUsd : targetUsd
  const sellValueUsd =
    amountValid && sellUsd ? amountNumber * sellUsd : undefined
  const buyValueUsd =
    receiveEstimate !== undefined && buyUsd
      ? receiveEstimate * buyUsd
      : undefined
  const balanceDisplay =
    balance !== undefined && spentMeta?.decimals !== undefined
      ? formatUnits(balance, spentMeta.decimals)
      : undefined
  const overBalance =
    amountBase !== undefined &&
    balance !== undefined &&
    BigInt(amountBase) > balance
  const presetPrice = (step: number) =>
    targetUsd ? toDecimalString(targetUsd * (1 + direction * step)) : ''

  const cta = submitting
    ? 'Placing order…'
    : !wallet
      ? 'Connect wallet'
      : !targetMeta || !settlementMeta
        ? 'Select tokens'
        : isNativeToken(target) || isNativeToken(settlement)
          ? 'Use the wrapped native token'
          : !hasPrice
            ? 'Enter a target price'
            : !amountBase
              ? 'Enter an amount'
              : !body.expiresAt
                ? 'Choose an expiry'
                : 'Place order'

  return (
    <div className={css.createLayout}>
      <section className={css.widget} aria-label="New limit order">
        <div className={css.card}>
          <div className={css.spread}>
            <span className={css.cardLabel}>
              When 1
              <TokenLogo meta={targetMeta} chainId={target.chainId} />
              <b className={css.cardToken}>{targetSymbol}</b> is worth
            </span>
            {vsMarket !== undefined && (
              <span
                className={cx(
                  css.delta,
                  vsMarket * direction < 0 && css.deltaWarn
                )}
              >
                {vsMarket >= 0 ? '+' : ''}
                {vsMarket.toFixed(2)}% vs market
              </span>
            )}
          </div>
          <div className={css.amountRow}>
            <span className={css.currency}>$</span>
            <input
              aria-label="Target price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              inputMode="decimal"
              className={css.amountInput}
            />
            <span className={css.unit}>USD</span>
          </div>
          <div className={css.row}>
            <button
              className={cx(
                css.chip,
                targetUsd !== undefined &&
                  price === toDecimalString(targetUsd) &&
                  css.chipActive
              )}
              disabled={!targetUsd}
              onClick={() => targetUsd && setPrice(toDecimalString(targetUsd))}
            >
              Market
            </button>
            {PRICE_STEPS.map((step) => (
              <button
                key={step}
                className={cx(
                  css.chip,
                  price !== '' && price === presetPrice(step) && css.chipActive
                )}
                disabled={!targetUsd}
                onClick={() => setPrice(presetPrice(step))}
              >
                {direction > 0 ? '+' : '−'}
                {step * 100}%
              </button>
            ))}
          </div>
          <span className={css.hint}>
            {targetUsd
              ? `Market $${formatNumber(targetUsd)}. `
              : 'No market price. '}
            {side === 'sell'
              ? `Sells once 1 ${targetSymbol} gets you at least this, after fees.`
              : `Buys once 1 ${targetSymbol} costs at most this, including fees.`}
          </span>
        </div>

        <div className={css.swapCards}>
          <div className={css.card}>
            <span className={css.cardLabel}>Sell</span>
            <div className={css.amountRow}>
              <input
                aria-label="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                inputMode="decimal"
                className={css.amountInput}
              />
              <TokenPill
                label="Sell"
                value={sellToken}
                onChange={setSellToken}
                meta={sellMeta}
                metaLoading={isFetching}
              />
            </div>
            <div className={css.spread}>
              <span className={css.hint}>
                {sellValueUsd !== undefined
                  ? `$${formatNumber(sellValueUsd, 4)}`
                  : '$0'}
              </span>
              <span className={cx(css.hint, overBalance && css.warnText)}>
                Balance{' '}
                {balanceDisplay !== undefined
                  ? `${formatNumber(Number(balanceDisplay))} ${spentSymbol}`
                  : '—'}
                {balanceDisplay !== undefined && (
                  <button
                    className={css.linkBtn}
                    onClick={() => setAmount(balanceDisplay)}
                  >
                    Max
                  </button>
                )}
              </span>
            </div>
          </div>

          <button
            className={css.flip}
            aria-label="Switch sell and buy tokens"
            onClick={() => {
              setSide(side === 'sell' ? 'buy' : 'sell')
              if (receiveEstimate !== undefined)
                setAmount(toDecimalString(receiveEstimate))
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path
                d="M8 3v10m0 0-4-4m4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className={css.card}>
            <span className={css.cardLabel}>Buy</span>
            <div className={css.amountRow}>
              <span
                className={cx(
                  css.amountInput,
                  receiveEstimate === undefined && css.amountPlaceholder
                )}
                aria-label="Estimated amount received"
              >
                {receiveEstimate !== undefined
                  ? `≈ ${formatNumber(receiveEstimate)}`
                  : '0'}
              </span>
              <TokenPill
                label="Buy"
                value={buyToken}
                onChange={setBuyToken}
                meta={buyMeta}
                metaLoading={isFetching}
              />
            </div>
            <div className={css.spread}>
              <span className={css.hint}>
                {buyValueUsd !== undefined
                  ? `$${formatNumber(buyValueUsd, 4)}`
                  : '$0'}
              </span>
              <span className={css.hint}>
                {side === 'sell' ? 'Minimum, estimated' : 'Estimated'}
              </span>
            </div>
          </div>
        </div>

        <div className={css.expiryRow}>
          <span className={css.cardLabel}>Expiry</span>
          <div className={css.row}>
            {(
              Object.keys(EXPIRY_PRESETS) as (keyof typeof EXPIRY_PRESETS)[]
            ).map((key) => (
              <button
                key={key}
                className={cx(css.chip, expiry === key && css.chipActive)}
                onClick={() => setExpiry(key)}
              >
                {EXPIRY_PRESETS[key].label}
              </button>
            ))}
            <button
              className={cx(css.chip, expiry === 'custom' && css.chipActive)}
              onClick={() => setExpiry('custom')}
            >
              Custom
            </button>
          </div>
        </div>
        {expiry === 'custom' && (
          <input
            type="datetime-local"
            aria-label="Custom expiry"
            value={customExpiry}
            onChange={(e) => setCustomExpiry(e.target.value)}
            className={css.input}
          />
        )}

        <button
          className={css.cta}
          disabled={wallet ? submitting || cta !== 'Place order' : false}
          onClick={() => (wallet ? submit() : setShowAuthFlow(true))}
        >
          {cta}
        </button>

        <dl className={css.details}>
          <dt>Order value</dt>
          <dd>
            {orderValueUsd !== undefined
              ? `$${formatNumber(orderValueUsd)}`
              : '—'}
          </dd>
          <dt>Rate at target</dt>
          <dd>
            {hasPrice && settlementUsd
              ? `1 ${targetSymbol} = ${formatNumber(priceNumber / settlementUsd)} ${settlementSymbol}`
              : '—'}
          </dd>
          <dt>Expires</dt>
          <dd>{expiryDate ? expiryDate.toLocaleString() : '—'}</dd>
        </dl>
      </section>

      <section className={css.settings}>
        <details className={css.collapsible}>
          <summary>Addresses</summary>
          <div className={css.collapsibleBody}>
            <label className={css.section}>
              <span className={css.label}>
                User · signs and funds the order
              </span>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value.trim())}
                placeholder={address ?? 'Connect a wallet'}
                className={cx(css.input, css.mono)}
              />
            </label>
            <label className={css.section}>
              <span className={css.label}>Recipient</span>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.trim())}
                placeholder="Defaults to user"
                className={cx(css.input, css.mono)}
              />
            </label>
            <label className={css.section}>
              <span className={css.label}>Refund to</span>
              <input
                value={refundTo}
                onChange={(e) => setRefundTo(e.target.value.trim())}
                placeholder="Defaults to user"
                className={cx(css.input, css.mono)}
              />
            </label>
          </div>
        </details>

        <details className={css.collapsible}>
          <summary>Advanced</summary>
          <div className={css.collapsibleBody}>
            <label className={css.section}>
              <span className={css.label}>Client order ID</span>
              <input
                value={clientOrderId}
                onChange={(e) => setClientOrderId(e.target.value)}
                placeholder="Optional; each id can be used once"
                className={css.input}
              />
            </label>
            <div className={css.section}>
              <span className={css.label}>Idempotency key</span>
              <div className={css.row}>
                <input
                  aria-label="Idempotency key"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  disabled={newKeyEachSubmit}
                  className={cx(css.input, css.mono, css.grow)}
                />
                <label className={css.row}>
                  <input
                    type="checkbox"
                    checked={newKeyEachSubmit}
                    onChange={(e) => setNewKeyEachSubmit(e.target.checked)}
                  />
                  New key each submit
                </label>
              </div>
              <span className={css.hint}>
                Untick and resubmit a changed order to see
                IDEMPOTENCY_KEY_REUSED.
              </span>
            </div>
            <div className={css.section}>
              <span className={css.label}>App fees</span>
              {appFees.map((fee, index) => (
                <div key={index} className={css.row}>
                  <input
                    value={fee.recipient}
                    placeholder="Recipient 0x…"
                    onChange={(e) =>
                      setAppFees(
                        appFees.map((f, i) =>
                          i === index
                            ? { ...f, recipient: e.target.value.trim() }
                            : f
                        )
                      )
                    }
                    className={cx(css.input, css.mono, css.grow)}
                  />
                  <input
                    value={fee.fee}
                    placeholder="bps"
                    onChange={(e) =>
                      setAppFees(
                        appFees.map((f, i) =>
                          i === index ? { ...f, fee: e.target.value } : f
                        )
                      )
                    }
                    className={css.input}
                    style={{ width: 70 }}
                  />
                  <button
                    className={css.chip}
                    onClick={() =>
                      setAppFees(appFees.filter((_, i) => i !== index))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div>
                <button
                  className={css.chip}
                  onClick={() =>
                    setAppFees([...appFees, { recipient: '', fee: '' }])
                  }
                >
                  + Add app fee
                </button>
              </div>
            </div>
            <div className={css.section}>
              <span className={css.label}>Fee sponsorship</span>
              <label className={css.row}>
                <input
                  type="checkbox"
                  checked={subsidizeFees}
                  onChange={(e) => setSubsidizeFees(e.target.checked)}
                />
                subsidizeFees
              </label>
              <div className={css.row}>
                {SPONSORED_COMPONENTS.map((component) => (
                  <label key={component} className={css.row}>
                    <input
                      type="checkbox"
                      checked={sponsored.includes(component)}
                      onChange={(e) =>
                        setSponsored(
                          e.target.checked
                            ? [...sponsored, component]
                            : sponsored.filter((c) => c !== component)
                        )
                      }
                    />
                    {component}
                  </label>
                ))}
              </div>
              <div className={css.row}>
                <input
                  aria-label="maxSubsidizationAmount"
                  value={maxSubsidizationAmount}
                  onChange={(e) => setMaxSubsidizationAmount(e.target.value)}
                  placeholder="maxSubsidizationAmount"
                  className={cx(css.input, css.grow)}
                />
                <input
                  aria-label="subsidizationBps"
                  value={subsidizationBps}
                  onChange={(e) => setSubsidizationBps(e.target.value)}
                  placeholder="subsidizationBps"
                  className={cx(css.input, css.grow)}
                />
              </div>
            </div>
          </div>
        </details>

        <details className={css.collapsible}>
          <summary>Request body</summary>
          <Json value={body} />
        </details>
      </section>
    </div>
  )
}
