import { GetServerSideProps, NextPage } from 'next'
import { useState } from 'react'
import type { Order } from '@relayprotocol/relay-sdk'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccount, useWalletClient } from 'wagmi'
import { Layout } from 'components/Layout'
import { ActivityLog, useActivityLog } from 'components/orders/ActivityLog'
import {
  CreateOrderForm,
  type OrderDraft
} from 'components/orders/CreateOrderForm'
import { OrderDetail } from 'components/orders/OrderDetail'
import { OrdersList } from 'components/orders/OrdersList'
import { cx } from 'components/orders/common'
import css from 'components/orders/orders.module.css'
import { isOrdersAccessAllowed } from 'utils/ordersAccess'

type Props = { ordersAllowed: boolean }
type Tab = 'create' | 'orders'

const OrdersPlayground = () => {
  const client = useRelayClient()
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const { data: wallet } = useWalletClient()
  const { entries, run, clear } = useActivityLog()
  const [tab, setTab] = useState<Tab>('create')
  const [selectedId, setSelectedId] = useState<string>()
  const [draft, setDraft] = useState<OrderDraft>()

  const selected = useQuery({
    queryKey: ['order', client?.baseApiUrl, selectedId],
    queryFn: async () =>
      (await client!.actions.getOrders({ orderId: selectedId! })).orders[0] ??
      null,
    enabled: Boolean(client && selectedId),
    refetchInterval: 5000,
    retry: false
  })

  const showOrder = (order?: Order) => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    if (!order) return
    queryClient.setQueryData(['order', client?.baseApiUrl, order.id], order)
    setSelectedId(order.id)
  }

  return (
    <div className={css.root}>
      <header className={css.header}>
        <div>
          <p className="demo-eyebrow">Relay SDK</p>
          <h1 className="demo-title">Limit orders</h1>
          <p className="demo-subtitle">
            Test the SDK's order actions. Every Relay API request goes through
            the VPN-gated orders proxy.
          </p>
        </div>
        <nav className={css.tabs} role="tablist">
          {(
            [
              ['create', 'Create'],
              ['orders', 'Orders']
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              className={cx(css.tab, tab === value && css.tabActive)}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className={css.content}>
        <div hidden={tab !== 'create'}>
          <CreateOrderForm
            wallet={wallet}
            address={address}
            run={run}
            onOrder={(order) => {
              showOrder(order)
              if (order) setTab('orders')
            }}
            draft={draft}
          />
        </div>
        <div hidden={tab !== 'orders'} className={css.ordersColumns}>
          <OrdersList
            address={address}
            selectedId={selectedId}
            onSelect={showOrder}
            run={run}
            onChanged={() =>
              queryClient.invalidateQueries({ queryKey: ['order'] })
            }
          />
          {selected.data ? (
            <OrderDetail
              key={selected.data.id}
              order={selected.data}
              wallet={wallet}
              run={run}
              onOrder={showOrder}
              onDuplicate={(order) => {
                setDraft({ key: Date.now(), order })
                setTab('create')
              }}
            />
          ) : (
            <section className={cx(css.panel, css.empty)}>
              Select an order to see its details, steps and actions.
            </section>
          )}
        </div>
      </main>

      <ActivityLog entries={entries} onClear={clear} />
    </div>
  )
}

const OrdersPage: NextPage<Props> = ({ ordersAllowed }) => (
  <Layout>
    {ordersAllowed ? (
      <OrdersPlayground />
    ) : (
      <div className={css.root}>
        <div className={cx(css.panel, css.denied)}>
          <h1 className="demo-title">VPN access required</h1>
          <p className="demo-subtitle">
            The limit orders page only works from an allowlisted IP address.
          </p>
        </div>
      </div>
    )}
  </Layout>
)

export const getServerSideProps: GetServerSideProps<Props> = async ({
  req
}) => ({
  props: { ordersAllowed: isOrdersAccessAllowed(req) }
})

export default OrdersPage
