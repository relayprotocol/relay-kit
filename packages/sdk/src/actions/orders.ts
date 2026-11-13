import type { AxiosRequestConfig } from 'axios'
import type { WalletClient } from 'viem'
import { getClient } from '../client.js'
import type {
  AdaptedWallet,
  CreateOrderBody,
  Execute,
  GetOrdersQuery,
  GetOrdersResponse,
  Order
} from '../types/index.js'
import {
  adaptViemWallet,
  axios,
  executeSteps,
  getApiKeyHeader,
  safeStructuredClone
} from '../utils/index.js'
import {
  isViemWalletClient,
  type AdaptViemWalletOptions
} from '../utils/viemWallet.js'

/** The order whose steps run, and the progress of those steps */
export type OrderProgressData = {
  order: Order
  steps: Execute['steps']
}

type OrderExecutionParameters = {
  wallet?: AdaptedWallet | WalletClient
  onProgress?: (data: OrderProgressData) => void
} & AdaptViemWalletOptions

export type CreateOrderParameters = {
  order: CreateOrderBody
  idempotencyKey?: string
} & OrderExecutionParameters

export type SignOrderParameters = {
  orderId: string
  signature: string
}

export type CancelOrderParameters = {
  orderId: string
  onchain?: boolean
} & OrderExecutionParameters

export type ExecuteOrderParameters = {
  order: Order
  wallet: AdaptedWallet | WalletClient
  onProgress?: (data: OrderProgressData) => void
} & AdaptViemWalletOptions

async function requestOrders<T>(config: AxiosRequestConfig): Promise<T> {
  const client = getClient()
  if (!client.baseApiUrl || !client.baseApiUrl.length) {
    throw new ReferenceError('RelayClient missing api url configuration')
  }
  const res = await axios.request({
    ...config,
    url: `${client.baseApiUrl}${config.url}`,
    headers: { ...config.headers, ...getApiKeyHeader(client) }
  })
  return res.data
}

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

/**
 * List the orders of the API key's integrator, newest first by default.
 * Pass `orderId` to read one order.
 * @param query - {@link GetOrdersQuery}
 */
export async function getOrders(
  query: GetOrdersQuery = {}
): Promise<GetOrdersResponse> {
  const { status, ...params } = query
  return requestOrders<GetOrdersResponse>({
    url: '/orders',
    method: 'get',
    params: {
      ...params,
      status: status?.length ? status.join(',') : undefined
    }
  })
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

/**
 * Run the steps an order asks of its owner with {@link executeSteps}: an
 * optional Permit2 approval and the `authorize` signature for a `pending`
 * order, or the `cancel` transaction of an onchain cancel. Use it to resume an
 * order read with {@link getOrders}.
 * @param parameters - {@link ExecuteOrderParameters}
 * @returns The order after its steps, read again from the API
 * @throws When the order is not listed for the client's API key afterwards
 */
export async function executeOrder({
  order,
  wallet,
  onProgress,
  disableCapabilitiesCheck
}: ExecuteOrderParameters): Promise<Order> {
  if (!order.steps.some((step) => step.status === 'incomplete')) {
    return order
  }
  const adaptedWallet = isViemWalletClient(wallet)
    ? adaptViemWallet(wallet, { disableCapabilitiesCheck })
    : wallet
  await executeSteps(
    order.originChainId,
    {},
    adaptedWallet,
    ({ steps }) => onProgress?.({ order, steps }),
    { steps: safeStructuredClone(order.steps) }
  )
  const { orders } = await getOrders({ orderId: order.id })
  if (!orders[0]) {
    throw new Error(
      `Order ${order.id} ran its steps but is not listed for this API key`
    )
  }
  return orders[0]
}
