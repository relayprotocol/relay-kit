import type { CreateOrderBody, Order } from '../../types/index.js'
import { executeOrder, type ExecuteOrderParameters } from './executeOrder.js'
import { requestOrders } from './requestOrders.js'

export type CreateOrderParameters = {
  order: CreateOrderBody
  idempotencyKey?: string
} & Partial<Omit<ExecuteOrderParameters, 'order'>>

/**
 * Create a limit order. With a wallet, also sends and signs the order's steps
 * (an optional Permit2 approval, then the order's signature), which opens it.
 * Without a wallet, returns the `pending` order with the steps still to run,
 * for {@link executeOrder}.
 * @param parameters - {@link CreateOrderParameters}
 * @returns The order after its last step
 */
export async function createOrder({
  order,
  idempotencyKey,
  wallet,
  ...options
}: CreateOrderParameters): Promise<Order> {
  const { order: created } = await requestOrders<{ order: Order }>({
    url: '/orders',
    method: 'post',
    data: order,
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}
  })
  return wallet ? executeOrder({ order: created, wallet, ...options }) : created
}
