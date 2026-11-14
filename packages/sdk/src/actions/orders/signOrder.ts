import type { Order } from '../../types/index.js'
import { requestOrders } from './requestOrders.js'

export type SignOrderParameters = {
  orderId: string
  signature: string
}

/**
 * Submit the user's signature of a `pending` order, which opens it. The
 * signature goes in the `signature` query param, as on every step `post`.
 * {@link createOrder} and {@link executeOrder} post it for you.
 * @param parameters - {@link SignOrderParameters}
 */
export async function signOrder({
  orderId,
  signature
}: SignOrderParameters): Promise<Order> {
  const { order } = await requestOrders<{ order: Order }>({
    url: `/orders/${encodeURIComponent(orderId)}/signature`,
    method: 'post',
    data: {},
    params: { signature }
  })
  return order
}
