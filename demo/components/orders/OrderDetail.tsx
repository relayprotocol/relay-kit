import { FC, useMemo, useState } from 'react'
import type { Order } from '@relayprotocol/relay-sdk'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import type { WalletClient } from 'viem'
import type { RunAction } from './ActivityLog'
import {
  Badge,
  cx,
  distanceToTarget,
  fillProgress,
  formatBaseUnits,
  formatDistance,
  formatNumber,
  formatTimeLeft,
  Json,
  orderSides,
  orderTokens,
  shortHex,
  spentMeta,
  statusLabel,
  switchWalletChain,
  unfillableReason,
  useTokensMeta,
  useUsdPrice
} from './common'
import { TokenLogo } from './TokenPill'
import css from './orders.module.css'

type Props = {
  order: Order
  wallet?: WalletClient
  run: RunAction
  onOrder: (order?: Order) => void
  onDuplicate: (order: Order) => void
  onClose: () => void
}

const usd = (value: string | null | undefined) =>
  value ? `$${formatNumber(Number(value))}` : '—'

export const OrderDetail: FC<Props> = ({
  order,
  wallet,
  run,
  onOrder,
  onDuplicate,
  onClose
}) => {
  const client = useRelayClient()
  const tokens = useMemo(() => orderTokens(order), [order])
  const { meta } = useTokensMeta(tokens)
  const [cancelMode, setCancelMode] = useState<'soft' | 'onchain'>()
  const [signature, setSignature] = useState('')
  const [busy, setBusy] = useState(false)

  const incomplete = order.steps.filter((step) => step.status === 'incomplete')
  const authorize = order.steps.find(
    (step) => step.id === 'authorize' && step.status === 'incomplete'
  )
  const nextStep = incomplete[0]
  const cancellable = order.status !== 'closed'
  const warning = unfillableReason(order)
  const spent = spentMeta(order, meta)
  const targetUsd = useUsdPrice(tokens[0])
  const settlementUsd = useUsdPrice(tokens[1])
  const { pay, receive, valueUsd } = orderSides(order, meta, settlementUsd)
  const targetMeta = order.side === 'sell' ? pay.meta : receive.meta
  const settlementMeta = order.side === 'sell' ? receive.meta : pay.meta
  const targetSymbol = targetMeta?.symbol ?? shortHex(order.targetCurrency, 4)
  const settlementSymbol =
    settlementMeta?.symbol ?? shortHex(order.settlementCurrency, 4)
  const progress = fillProgress(order)
  const timeLeft = formatTimeLeft(order.expiresAt)
  const chainName = (id: number) =>
    client?.chains.find((chain) => chain.id === id)?.displayName ?? `${id}`

  const act = async <T,>(fn: () => Promise<T | undefined>) => {
    setBusy(true)
    const result = await fn()
    setBusy(false)
    return result
  }

  const execute = () =>
    act(async () =>
      onOrder(
        await run(
          `executeOrder (${incomplete.map((step) => step.id).join(', ')})`,
          { orderId: order.id, steps: incomplete.map((step) => step.id) },
          async (onProgress) => {
            await switchWalletChain(wallet!, order.originChainId)
            return client!.actions.executeOrder({
              order,
              wallet: wallet!,
              onProgress
            })
          }
        )
      )
    )

  const cancel = (mode: 'soft' | 'onchain') =>
    act(async () => {
      const updated = await run(
        mode === 'soft' ? 'cancelOrder (soft)' : 'cancelOrder (onchain)',
        { orderId: order.id, onchain: mode === 'onchain' || undefined },
        async (onProgress) => {
          if (mode === 'soft') {
            return client!.actions.cancelOrder({ orderId: order.id })
          }
          if (wallet) await switchWalletChain(wallet, order.originChainId)
          return client!.actions.cancelOrder({
            orderId: order.id,
            onchain: true,
            wallet,
            onProgress
          })
        }
      )
      setCancelMode(undefined)
      onOrder(updated)
    })

  const signWithWallet = () =>
    act(async () => {
      const sign = authorize?.data?.sign
      const signed = await run(
        'signOrder (wallet signature)',
        { orderId: order.id, typedData: sign },
        async () => {
          if (!wallet?.account) throw new Error('Connect a wallet')
          if (sign?.domain?.chainId) {
            await switchWalletChain(wallet, Number(sign.domain.chainId))
          }
          const signature = await wallet.signTypedData({
            account: wallet.account,
            domain: sign.domain,
            types: sign.types,
            primaryType: sign.primaryType,
            message: sign.value
          })
          setSignature(signature)
          return client!.actions.signOrder({ orderId: order.id, signature })
        }
      )
      onOrder(signed)
    })

  const submitSignature = () =>
    act(async () =>
      onOrder(
        await run(
          'signOrder (pasted signature)',
          { orderId: order.id, signature },
          () => client!.actions.signOrder({ orderId: order.id, signature })
        )
      )
    )

  const amountRow = (side: typeof pay, approx: boolean) => (
    <div className={css.amountLine}>
      <div>
        <div className={css.amountBig}>
          {side.amount !== undefined
            ? `${approx ? '≈' : ''}${formatNumber(side.amount)}`
            : '?'}{' '}
          {side.meta?.symbol}
        </div>
        <span className={css.hint}>
          {valueUsd !== undefined ? `$${formatNumber(valueUsd, 4)}` : '—'}
        </span>
      </div>
      <TokenLogo meta={side.meta} chainId={side.token.chainId} />
    </div>
  )

  return (
    <>
      <div className={css.spread}>
        <h2 className={css.modalTitle}>Order details</h2>
        <button className={css.closeBtn} aria-label="Close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={css.detailHead}>
        <TokenLogo meta={pay.meta} chainId={pay.token.chainId} />
        <div className={css.orderRowMain}>
          <b>
            {statusLabel(order)}{' '}
            {warning && (
              <Badge value={warning.replace(/_/g, ' ')} tone="warning" />
            )}
            {order.cancelReason === 'access_revoked' && (
              <Badge value="access revoked" tone="cancelled" />
            )}
          </b>
          <span className={css.hint}>
            {new Date(order.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className={cx(css.section, css.sectionDivider)}>
        {amountRow(pay, false)}
        <span className={css.hint}>↓</span>
        {amountRow(receive, true)}
      </div>

      <dl className={cx(css.summary, css.sectionDivider)}>
        <dt>{order.side === 'sell' ? 'Sell' : 'Buy'} price</dt>
        <dd>
          ${formatNumber(Number(order.targetPrice))} per {targetSymbol}
        </dd>
        {settlementUsd && (
          <>
            <dt>Rate</dt>
            <dd>
              1 {targetSymbol} ={' '}
              {formatNumber(Number(order.targetPrice) / settlementUsd)}{' '}
              {settlementSymbol}
            </dd>
          </>
        )}
        <dt>Market</dt>
        <dd>
          {usd(order.latestCheck?.marketPrice ?? targetUsd?.toString())}
          {cancellable && formatDistance(distanceToTarget(order)) && (
            <span className={css.hint}>
              {' '}
              ({formatDistance(distanceToTarget(order))})
            </span>
          )}
        </dd>
        {progress > 0 && (
          <>
            <dt>Filled</dt>
            <dd>
              {progress}% · {formatBaseUnits(order.filledAmount, spent)}
            </dd>
          </>
        )}
        <dt>Expiry</dt>
        <dd>
          {new Date(order.expiresAt).toLocaleString()}
          {cancellable && timeLeft && (
            <span className={css.hint}> ({timeLeft})</span>
          )}
        </dd>
        {order.targetChainId !== order.settlementChainId && (
          <>
            <dt>Route</dt>
            <dd>
              {chainName(order.originChainId)} →{' '}
              {chainName(order.destinationChainId)}
            </dd>
          </>
        )}
        <dt>Order ID</dt>
        <dd className={css.mono}>
          <button
            className={css.linkBtn}
            title="Copy order ID"
            onClick={() => navigator.clipboard.writeText(order.id)}
          >
            {shortHex(order.id, 4)} ⧉
          </button>
        </dd>
        {order.requestIds.length > 0 && (
          <>
            <dt>Fills</dt>
            <dd>
              {order.requestIds.map((requestId) => (
                <a
                  key={requestId}
                  href={`https://relay.link/transaction/${requestId}`}
                  target="_blank"
                  rel="noreferrer"
                  className={css.modalLink}
                  style={{ display: 'block' }}
                >
                  {shortHex(requestId, 4)} ↗
                </a>
              ))}
            </dd>
          </>
        )}
      </dl>

      {!cancelMode && (nextStep || cancellable) && (
        <div className={css.section}>
          {nextStep && (
            <button
              className={css.cta}
              disabled={busy || !wallet}
              onClick={execute}
            >
              {!wallet
                ? 'Connect a wallet'
                : nextStep.id === 'cancel'
                  ? 'Send cancel transaction'
                  : 'Sign order'}
            </button>
          )}
          {cancellable && (
            <button
              className={cx(css.btn, css.btnBlock)}
              disabled={busy}
              onClick={() => setCancelMode('soft')}
            >
              Cancel order
            </button>
          )}
        </div>
      )}

      {cancelMode && (
        <div className={css.callout}>
          <b>Cancel this order</b>
          <label className={css.radio}>
            <input
              type="radio"
              checked={cancelMode === 'soft'}
              onChange={() => setCancelMode('soft')}
            />
            <span>
              <b>Soft cancel</b> · free and immediate. Relay stops watching the
              order and never relays its permit.
            </span>
          </label>
          <label className={css.radio}>
            <input
              type="radio"
              checked={cancelMode === 'onchain'}
              onChange={() => setCancelMode('onchain')}
            />
            <span>
              <b>On-chain cancel</b> · also sends a transaction (gas) that
              invalidates the permit's Permit2 nonce.
            </span>
          </label>
          <span className={css.hint}>
            The order can still fill while the cancel is processed. A
            soft-cancelled order can't be cancelled on-chain later
            (ORDER_ALREADY_CANCELLED).
          </span>
          <div className={css.row}>
            <button
              className={cx(css.btn, css.btnDangerSolid)}
              disabled={busy}
              onClick={() => cancel(cancelMode)}
            >
              {cancelMode === 'soft'
                ? 'Soft cancel'
                : wallet
                  ? 'Cancel on-chain'
                  : 'Cancel on-chain (send the transaction later)'}
            </button>
            <button
              className={css.btn}
              onClick={() => setCancelMode(undefined)}
            >
              Keep order
            </button>
          </div>
        </div>
      )}

      <button className={css.linkBtn} onClick={() => onDuplicate(order)}>
        Duplicate into a new order
      </button>

      <details className={css.collapsible}>
        <summary>Advanced</summary>
        <div className={css.collapsibleBody}>
          <dl className={css.summary}>
            <dt>Status</dt>
            <dd>
              <Badge value={order.status} />{' '}
              {order.outcome && <Badge value={order.outcome} />}
            </dd>
            <dt>Last check</dt>
            <dd>
              {order.latestCheck
                ? `${order.latestCheck.reason ?? 'ok'} · all-in ${usd(order.latestCheck.allInPrice)} · ${new Date(order.latestCheck.checkedAt).toLocaleTimeString()}`
                : '—'}
            </dd>
            <dt>Refunded / withdrawn</dt>
            <dd>
              {formatBaseUnits(order.refundedAmount, spent)} /{' '}
              {formatBaseUnits(order.withdrawnAmount, spent)}
            </dd>
            {order.closedAt && (
              <>
                <dt>Closed</dt>
                <dd>{new Date(order.closedAt).toLocaleString()}</dd>
              </>
            )}
          </dl>
          <span className={css.label}>Steps</span>
          {order.steps.length === 0 && (
            <span className={css.hint}>No steps.</span>
          )}
          <div className={css.steps}>
            {order.steps.map((step) => (
              <div key={step.id} className={css.step}>
                <Badge
                  value={step.status}
                  tone={step.status === 'complete' ? 'filled' : 'pending'}
                />
                <code>{step.id}</code>
                <span className={css.hint}>
                  {step.action} · {step.kind}
                </span>
              </div>
            ))}
          </div>
          {nextStep && (
            <span className={css.hint}>
              {nextStep.id === 'cancel'
                ? 'Send cancel transaction'
                : 'Sign order'}{' '}
              runs the incomplete steps with executeOrder.
            </span>
          )}
          {authorize && (
            <>
              <span className={css.label}>Sign manually (signOrder)</span>
              <span className={css.hint}>
                Posts only the signature and skips any approve step; use Sign
                order if the token still needs a Permit2 approval.
              </span>
              <div>
                <button
                  className={css.btn}
                  disabled={busy || !wallet}
                  onClick={signWithWallet}
                >
                  Sign typed data with wallet and submit
                </button>
              </div>
              <div className={css.row}>
                <input
                  value={signature}
                  onChange={(e) => setSignature(e.target.value.trim())}
                  placeholder="Or paste a signature 0x…"
                  className={cx(css.input, css.mono, css.grow)}
                />
                <button
                  className={css.btn}
                  disabled={busy || !signature}
                  onClick={submitSignature}
                >
                  Submit signature
                </button>
              </div>
              <Json value={authorize.data?.sign} />
            </>
          )}
          <span className={css.label}>Order JSON</span>
          <Json value={order} />
        </div>
      </details>
    </>
  )
}
