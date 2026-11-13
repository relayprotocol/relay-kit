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
  Json,
  orderTokens,
  spentMeta,
  switchWalletChain,
  tokenKey,
  unfillableReason,
  useTokensMeta
} from './common'
import css from './orders.module.css'

type Props = {
  order: Order
  wallet?: WalletClient
  run: RunAction
  onOrder: (order?: Order) => void
  onDuplicate: (order: Order) => void
}

const usd = (value: string | null | undefined) =>
  value ? `$${formatNumber(Number(value))}` : '—'

export const OrderDetail: FC<Props> = ({
  order,
  wallet,
  run,
  onOrder,
  onDuplicate
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
  const symbol = (chainId: number, address: string) =>
    meta[tokenKey({ chainId, address })]?.symbol ?? address
  const targetSymbol = symbol(order.targetChainId, order.targetCurrency)
  const settlementSymbol = symbol(
    order.settlementChainId,
    order.settlementCurrency
  )
  const chainName = (id: number) =>
    client?.chains.find((chain) => chain.id === id)?.displayName ?? `${id}`

  const act = async <T,>(fn: () => Promise<T | undefined>) => {
    setBusy(true)
    const result = await fn()
    setBusy(false)
    return result
  }

  const refresh = () =>
    act(async () => {
      const result = await run('getOrders', { orderId: order.id }, () =>
        client!.actions.getOrders({ orderId: order.id })
      )
      onOrder(result?.orders[0])
    })

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
          await switchWalletChain(wallet!, order.originChainId)
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

  return (
    <section className={cx(css.panel, css.sticky)}>
      <div className={css.panelHeader}>
        <div className={css.row}>
          <Badge value={order.status} />
          {order.outcome && <Badge value={order.outcome} />}
          {order.cancelReason && (
            <Badge value={`cancel: ${order.cancelReason}`} tone="cancelled" />
          )}
          {warning && <Badge value={warning} tone="warning" />}
        </div>
        <div className={css.row}>
          <button
            className={cx(css.btn, css.btnSmall)}
            disabled={busy}
            onClick={refresh}
          >
            Refresh
          </button>
          <button
            className={cx(css.btn, css.btnSmall)}
            onClick={() => onDuplicate(order)}
          >
            Duplicate
          </button>
        </div>
      </div>

      <div>
        <div className={css.headline}>
          {order.side === 'sell'
            ? `Sell ${formatBaseUnits(order.amount, spent)} for ${settlementSymbol}`
            : `Buy ${targetSymbol} with ${formatBaseUnits(order.amount, spent)}`}
        </div>
        <span className={cx(css.hint, css.mono)}>{order.id}</span>
      </div>

      <dl className={css.summary}>
        <dt>Target price</dt>
        <dd>
          {usd(order.targetPrice)} per {targetSymbol}
        </dd>
        <dt>Market / all-in</dt>
        <dd>
          {usd(order.latestCheck?.marketPrice)} /{' '}
          {usd(order.latestCheck?.allInPrice)}
          {cancellable && formatDistance(distanceToTarget(order)) && (
            <span className={css.hint}>
              {' '}
              ({formatDistance(distanceToTarget(order))})
            </span>
          )}
        </dd>
        <dt>Last check</dt>
        <dd>
          {order.latestCheck
            ? `${order.latestCheck.reason ?? 'ok'} · ${new Date(order.latestCheck.checkedAt).toLocaleTimeString()}`
            : '—'}
        </dd>
        <dt>Filled</dt>
        <dd>
          {fillProgress(order)}% · {formatBaseUnits(order.filledAmount, spent)}
        </dd>
        <dt>Refunded / withdrawn</dt>
        <dd>
          {formatBaseUnits(order.refundedAmount, spent)} /{' '}
          {formatBaseUnits(order.withdrawnAmount, spent)}
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
        <dt>Expires</dt>
        <dd>{new Date(order.expiresAt).toLocaleString()}</dd>
        {order.closedAt && (
          <>
            <dt>Closed</dt>
            <dd>{new Date(order.closedAt).toLocaleString()}</dd>
          </>
        )}
        {order.requestIds.length > 0 && (
          <>
            <dt>Requests</dt>
            <dd>
              {order.requestIds.map((requestId) => (
                <a
                  key={requestId}
                  href={`https://relay.link/transaction/${requestId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'block' }}
                >
                  {requestId.slice(0, 10)}…
                </a>
              ))}
            </dd>
          </>
        )}
      </dl>

      <div className={cx(css.section, css.sectionDivider)}>
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
      </div>

      {(nextStep || (cancellable && !cancelMode)) && (
        <div className={css.section}>
          <div className={css.row}>
            {nextStep && (
              <button
                className={cx(css.btn, css.btnPrimary)}
                disabled={busy || !wallet}
                onClick={execute}
              >
                {nextStep.id === 'cancel'
                  ? 'Send cancel transaction'
                  : 'Sign order'}
              </button>
            )}
            {cancellable && !cancelMode && (
              <button
                className={cx(css.btn, css.btnDanger)}
                disabled={busy}
                onClick={() => setCancelMode('soft')}
              >
                Cancel order
              </button>
            )}
          </div>
          {nextStep && (
            <span className={css.hint}>
              Runs the incomplete steps with executeOrder.
              {!wallet && ' Connect a wallet first.'}
            </span>
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

      {authorize && (
        <details className={css.collapsible}>
          <summary>Sign manually (signOrder)</summary>
          <div className={css.collapsibleBody}>
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
          </div>
        </details>
      )}

      <details className={css.collapsible}>
        <summary>Order JSON</summary>
        <Json value={order} />
      </details>
    </section>
  )
}
