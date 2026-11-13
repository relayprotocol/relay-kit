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
  distanceToTarget,
  fillProgress,
  formatBaseUnits,
  formatDistance,
  formatNumber,
  OPEN_STATUSES,
  orderTokens,
  shortHex,
  spentMeta,
  tokenKey,
  unfillableReason,
  useTokensMeta
} from './common'
import css from './orders.module.css'

type Tab = 'open' | 'history' | 'custom'

type Props = {
  address?: string
  selectedId?: string
  onSelect: (order: Order) => void
  run: RunAction
  onChanged: () => void
}

const toUnix = (value: string) =>
  value ? Math.floor(new Date(value).getTime() / 1000) : undefined

export const OrdersList: FC<Props> = ({
  address,
  selectedId,
  onSelect,
  run,
  onChanged
}) => {
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
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lookupId, setLookupId] = useState('')
  const [checked, setChecked] = useState<string[]>([])
  const [bulkCancelling, setBulkCancelling] = useState(false)

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
    refetchInterval: autoRefresh ? 5000 : false,
    retry: false
  })

  const list = useMemo(
    () => orders.data?.pages.flatMap((page) => page.orders) ?? [],
    [orders.data]
  )
  const tokens = useMemo(() => list.flatMap(orderTokens), [list])
  const { meta } = useTokensMeta(tokens)
  const chainName = (id: number) =>
    client?.chains.find((chain) => chain.id === id)?.displayName ?? id
  const symbol = (chainId: number, address: string) =>
    meta[tokenKey({ chainId, address })]?.symbol ?? shortHex(address, 4)

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

  const cancelChecked = async () => {
    setBulkCancelling(true)
    for (const orderId of checked) {
      await run('cancelOrder (soft)', { orderId }, () =>
        client!.actions.cancelOrder({ orderId })
      )
    }
    setBulkCancelling(false)
    setChecked([])
    onChanged()
  }

  const errorMessage = (orders.error as any)?.message

  return (
    <section className={css.panel}>
      <div className={css.panelHeader}>
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
        <div className={css.row}>
          <label className={cx(css.row, css.hint)}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            className={cx(css.btn, css.btnSmall)}
            onClick={() => {
              loggedReads.current.clear()
              orders.refetch()
            }}
          >
            {orders.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className={css.toolbar}>
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
        <details className={css.collapsible}>
          <summary className={css.hint}>More filters</summary>
          <div className={css.collapsibleBody}>
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
      </div>

      {checked.length > 0 && (
        <div className={cx(css.spread, css.callout)}>
          <span>{checked.length} selected</span>
          <div className={css.row}>
            <button
              className={cx(css.btn, css.btnSmall)}
              onClick={() => setChecked([])}
            >
              Clear
            </button>
            <button
              className={cx(css.btn, css.btnSmall, css.btnDangerSolid)}
              disabled={bulkCancelling}
              onClick={cancelChecked}
            >
              {bulkCancelling ? 'Cancelling…' : 'Soft cancel selected'}
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <span className={css.error}>
          {(orders.error as any)?.rawError?.errorCode ?? 'Error'}:{' '}
          {errorMessage}
        </span>
      )}

      <div className={css.list}>
        {waitingForWallet && (
          <div className={css.empty}>
            Connect a wallet to see your orders, or pick another filter.
          </div>
        )}
        {!waitingForWallet && !orders.isFetching && list.length === 0 && (
          <div className={css.empty}>No orders match these filters.</div>
        )}
        {list.map((order) => {
          const warning = unfillableReason(order)
          const progress = fillProgress(order)
          const closed = order.status === 'closed'
          const crossChain = order.targetChainId !== order.settlementChainId
          return (
            <div
              key={order.id}
              role="button"
              aria-label={`Order ${order.id}`}
              onClick={() => onSelect(order)}
              className={cx(
                css.listItem,
                order.id === selectedId && css.listItemActive
              )}
            >
              <input
                type="checkbox"
                aria-label={`Select order ${order.id}`}
                disabled={closed}
                checked={checked.includes(order.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setChecked(
                    e.target.checked
                      ? [...checked, order.id]
                      : checked.filter((id) => id !== order.id)
                  )
                }
              />
              <div className={css.listMain}>
                <div className={css.row}>
                  {order.side === 'sell' ? (
                    <span>
                      <b>Sell</b>{' '}
                      {formatBaseUnits(order.amount, spentMeta(order, meta))}{' '}
                      <span className={css.hint}>for</span>{' '}
                      {symbol(
                        order.settlementChainId,
                        order.settlementCurrency
                      )}
                    </span>
                  ) : (
                    <span>
                      <b>Buy</b>{' '}
                      {symbol(order.targetChainId, order.targetCurrency)}{' '}
                      <span className={css.hint}>with</span>{' '}
                      {formatBaseUnits(order.amount, spentMeta(order, meta))}
                    </span>
                  )}
                  <span className={css.hint}>
                    at ${formatNumber(Number(order.targetPrice))}
                  </span>
                </div>
                <span className={css.hint}>
                  <code>{shortHex(order.id, 4)}</code> ·{' '}
                  {new Date(order.createdAt).toLocaleString()}
                  {crossChain &&
                    ` · ${chainName(order.targetChainId)} → ${chainName(order.settlementChainId)}`}
                  {!closed &&
                    formatDistance(distanceToTarget(order)) &&
                    ` · ${formatDistance(distanceToTarget(order))}`}
                </span>
              </div>
              <div className={css.listSide}>
                <div className={css.row} style={{ gap: 4 }}>
                  {warning && <Badge value={warning} tone="warning" />}
                  <Badge value={order.outcome ?? order.status} />
                </div>
                {progress > 0 && (
                  <div className={css.row} style={{ gap: 6 }}>
                    <div className={css.progress}>
                      <div
                        className={css.progressBar}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className={css.hint}>{progress}%</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
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
