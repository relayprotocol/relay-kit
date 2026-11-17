import type { Order } from '../../types/index.js'
import { getOrders } from './getOrders.js'
import { isAlreadySigned, requestOrders } from './requestOrders.js'

export type SignOrderParameters = {
  orderId: string
  signature: string
}

/**
 * Submit the user's signature of a `pending` order, which opens it. The
 * signature goes in the `signature` query param, as on every step `post`.
 * {@link createOrder} and {@link executeOrder} post it for you. Posting a
 * signature the order was already opened with returns the order as it is now.
 * @param parameters - {@link SignOrderParameters}
 */
export async function signOrder({
  orderId,
  signature
}: SignOrderParameters): Promise<Order> {
  try {
    const { order } = await requestOrders<{ order: Order }>({
      url: `/orders/${encodeURIComponent(orderId)}/signature`,
      method: 'post',
      data: {},
      params: { signature }
    })
    return order
  } catch (error) {
    const order = isAlreadySigned(error)
      ? (await getOrders({ orderId })).orders[0]
      : undefined
    if (!order) throw error
    return order
  }
}
