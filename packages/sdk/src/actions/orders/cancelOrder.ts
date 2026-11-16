import type { Order } from '../../types/index.js'
import { executeOrder, type ExecuteOrderParameters } from './executeOrder.js'
import { requestOrders } from './requestOrders.js'

export type CancelOrderParameters = {
  orderId: string
  onchain?: boolean
} & Partial<Omit<ExecuteOrderParameters, 'order'>>

/**
 * Cancel an order. The default soft cancel is gasless: Relay never relays the
 * order's permit. With `onchain`, the order also gets a `cancel` step that
 * invalidates the permit's Permit2 nonce, which is sent when a wallet is given.
 * @param parameters - {@link CancelOrderParameters}
 */
export async function cancelOrder({
  orderId,
  onchain,
  wallet,
  ...options
}: CancelOrderParameters): Promise<Order> {
  const { order } = await requestOrders<{ order: Order }>({
    url: `/orders/${encodeURIComponent(orderId)}/cancel`,
    method: 'post',
    data: { onchain }
  })
  return wallet ? executeOrder({ order, wallet, ...options }) : order
}
