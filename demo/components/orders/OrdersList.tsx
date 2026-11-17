import { FC, useMemo, useRef, useState } from 'react'
import type {
  GetOrdersQuery,
  Order,
  OrderStatus
} from '@relayprotocol/relay-sdk'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { RunAction } from './ActivityLog'
import {
  ALL_STATUSES,
  Badge,
  cx,
  fillProgress,
  formatNumber,
  formatTimeLeft,
  OPEN_STATUSES,
  orderSides,
  orderTokens,
  statusLabel,
  unfillableReason,
  useTokensMeta,
  useUsdPrice,
  type TokenMeta
} from './common'
import { TokenLogo } from './TokenPill'
import css from './orders.module.css'

type Tab = 'open' | 'history' | 'custom'

type Props = {
  address?: string
  onSelect: (order: Order) => void
  run: RunAction
}

const TITLES: Record<Tab, [string, string]> = {
  open: ['Open orders', 'open order'],
  history: ['Order history', 'closed order'],
  custom: ['Orders by status', 'order']
}

const OrderRow: FC<{
  order: Order
  meta: Record<string, TokenMeta>
  onSelect: (order: Order) => void
}> = ({ order, meta, onSelect }) => {
  const settlementUsd = useUsdPrice(orderTokens(order)[1])
  const { pay, receive, valueUsd } = orderSides(order, meta, settlementUsd)
  const warning = unfillableReason(order)
  const progress = fillProgress(order)
  const timeLeft = formatTimeLeft(order.expiresAt)
  const subtitle =
    order.status === 'closed'
      ? `${order.outcome ? order.outcome[0].toUpperCase() + order.outcome.slice(1) : 'Closed'} · ${new Date(order.closedAt ?? order.updatedAt).toLocaleDateString()}`
      : order.status === 'open'
        ? timeLeft
          ? `Expires in ${timeLeft}`
          : 'Expired'
        : statusLabel(order)
  return (
    <button
      aria-label={`Order ${order.id}`}
      onClick={() => onSelect(order)}
      className={css.orderRow}
    >
      <TokenLogo meta={pay.meta} chainId={pay.token.chainId} />
      <span className={css.orderRowMain}>
        <b>
          {pay.amount !== undefined ? formatNumber(pay.amount, 4) : '?'}{' '}
          {pay.meta?.symbol} → {receive.meta?.symbol}
        </b>
        <span className={css.hint}>
          {subtitle}
          {progress > 0 && ` · ${progress}% filled`}
          {warning && (
            <>
              {' '}
              <Badge value={warning.replace(/_/g, ' ')} tone="warning" />
            </>
          )}
        </span>
      </span>
      <span className={css.orderRowSide}>
        <b>{valueUsd !== undefined ? `$${formatNumber(valueUsd, 4)}` : '—'}</b>
        <span className={css.hint}>
          {order.side === 'sell' ? 'Sell' : 'Buy'} at $
          {formatNumber(Number(order.targetPrice))}
        </span>
      </span>
    </button>
  )
}

const toUnix = (value: string) =>
  value ? Math.floor(new Date(value).getTime() / 1000) : undefined

export const OrdersList: FC<Props> = ({ address, onSelect, run }) => {
  const client = useRelayClient()
  const [tab, setTab] = useState<Tab>('open')
  const [statuses, setStatuses] = useState<OrderStatus[]>(ALL_STATUSES)
  const [userFilter, setUserFilter] = useState<'mine' | 'all' | 'custom'>(
    'mine'
  )
  const [customUser, setCustomUser] = useState('')
  const [originChainId, setOriginChainId] = useState('')
  const [destinationChainId, setDestinationChainId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt'>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [limit, setLimit] = useState(20)
  const [lookupId, setLookupId] = useState('')

  const query: GetOrdersQuery = {
    user:
      userFilter === 'mine'
        ? address
        : userFilter === 'custom'
          ? customUser || undefined
          : undefined,
    status:
      tab === 'open'
        ? OPEN_STATUSES
        : tab === 'history'
          ? ['closed']
          : statuses,
    originChainId: originChainId ? Number(originChainId) : undefined,
    destinationChainId: destinationChainId
      ? Number(destinationChainId)
      : undefined,
    startTimestamp: toUnix(start),
    endTimestamp: toUnix(end),
    sortBy,
    sortDirection,
    limit
  }
  const waitingForWallet = userFilter === 'mine' && !address
  const loggedReads = useRef(new Set<string>())

  const orders = useInfiniteQuery({
    queryKey: ['orders', client?.baseApiUrl, query],
    queryFn: async ({ pageParam }) => {
      const params = { ...query, continuation: pageParam }
      const key = JSON.stringify(params)
      if (loggedReads.current.has(key)) return client!.actions.getOrders(params)
      loggedReads.current.add(key)
      return (await run(
        'getOrders',
        params,
        () => client!.actions.getOrders(params),
        { rethrow: true }
      ))!
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.continuation || undefined,
    enabled: Boolean(client) && !waitingForWallet,
    refetchInterval: 5000,
    retry: false
  })

  const list = useMemo(
    () => orders.data?.pages.flatMap((page) => page.orders) ?? [],
    [orders.data]
  )
  const tokens = useMemo(() => list.flatMap(orderTokens), [list])
  const { meta } = useTokensMeta(tokens)

  const lookup = async () => {
    const id = lookupId.trim()
    if (!id) return
    const result = await run('getOrders', { orderId: id }, async () => {
      const response = await client!.actions.getOrders({ orderId: id })
      if (!response.orders[0]) {
        throw new Error(`No order ${id} for this API key`)
      }
      return response
    })
    if (result?.orders[0]) onSelect(result.orders[0])
  }

  const errorMessage = (orders.error as any)?.message

  return (
    <section className={cx(css.panel, css.ordersPanel)}>
      <div className={css.panelHeader}>
        <div>
          <h2 className={css.panelTitle}>{TITLES[tab][0]}</h2>
          <span className={css.hint}>
            {waitingForWallet
              ? 'Connect a wallet'
              : `${list.length}${orders.hasNextPage ? '+' : ''} ${TITLES[tab][1]}${list.length === 1 ? '' : 's'}`}
          </span>
        </div>
        <div className={css.segmented}>
          {(
            [
              ['open', 'Open'],
              ['history', 'History'],
              ['custom', 'By status']
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={cx(css.segment, tab === value && css.segmentActive)}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'custom' && (
        <div className={css.row}>
          {ALL_STATUSES.map((status) => (
            <button
              key={status}
              className={cx(
                css.chip,
                statuses.includes(status) && css.chipActive
              )}
              onClick={() =>
                setStatuses(
                  statuses.includes(status)
                    ? statuses.filter((s) => s !== status)
                    : [...statuses, status]
                )
              }
            >
              {status}
            </button>
          ))}
        </div>
      )}
      <details className={css.collapsible}>
        <summary className={css.hint}>Filters</summary>
        <div className={css.collapsibleBody}>
          <div className={css.row}>
            {(['mine', 'all', 'custom'] as const).map((value) => (
              <button
                key={value}
                className={cx(css.chip, userFilter === value && css.chipActive)}
                onClick={() => setUserFilter(value)}
              >
                {value === 'mine'
                  ? 'My wallet'
                  : value === 'all'
                    ? 'All app orders'
                    : 'Other address'}
              </button>
            ))}
            {userFilter === 'custom' && (
              <input
                value={customUser}
                onChange={(e) => setCustomUser(e.target.value.trim())}
                placeholder="0x… user"
                className={cx(css.input, css.mono, css.grow)}
              />
            )}
          </div>
          <div className={css.row}>
            <input
              value={originChainId}
              onChange={(e) => setOriginChainId(e.target.value)}
              placeholder="Origin chain id"
              className={cx(css.input, css.grow)}
            />
            <input
              value={destinationChainId}
              onChange={(e) => setDestinationChainId(e.target.value)}
              placeholder="Destination chain id"
              className={cx(css.input, css.grow)}
            />
          </div>
          <div className={css.row}>
            <label className={cx(css.row, css.hint, css.grow)}>
              From
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={cx(css.input, css.grow)}
              />
            </label>
            <label className={cx(css.row, css.hint, css.grow)}>
              To
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={cx(css.input, css.grow)}
              />
            </label>
          </div>
          <div className={css.row}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={css.select}
            >
              <option value="createdAt">Sort by created</option>
              <option value="updatedAt">Sort by updated</option>
            </select>
            <select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as any)}
              className={css.select}
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
            <label className={cx(css.row, css.hint)}>
              Page size
              <input
                type="number"
                aria-label="Page size"
                min={1}
                max={50}
                value={limit}
                onChange={(e) =>
                  setLimit(
                    Math.min(50, Math.max(1, Number(e.target.value) || 20))
                  )
                }
                className={css.input}
                style={{ width: 64 }}
              />
            </label>
          </div>
          <div className={css.row}>
            <input
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Order id"
              className={cx(css.input, css.mono, css.grow)}
            />
            <button className={cx(css.btn, css.btnSmall)} onClick={lookup}>
              Look up
            </button>
          </div>
        </div>
      </details>

      {errorMessage && (
        <span className={css.error}>
          {(orders.error as any)?.rawError?.errorCode ?? 'Error'}:{' '}
          {errorMessage}
        </span>
      )}

      <div className={css.orderList}>
        {waitingForWallet && (
          <div className={css.empty}>
            Connect a wallet to see your orders, or pick another filter.
          </div>
        )}
        {!waitingForWallet && !orders.isFetching && list.length === 0 && (
          <div className={css.empty}>No orders match these filters.</div>
        )}
        {list.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            meta={meta}
            onSelect={onSelect}
          />
        ))}
      </div>
      {orders.hasNextPage && (
        <button
          className={cx(css.btn, css.btnBlock)}
          disabled={orders.isFetchingNextPage}
          onClick={() => orders.fetchNextPage()}
        >
          {orders.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </section>
  )
}
