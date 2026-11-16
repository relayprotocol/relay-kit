import type { WalletClient } from 'viem'
import type { AdaptedWallet, Execute, Order } from '../../types/index.js'
import {
  adaptViemWallet,
  executeSteps,
  safeStructuredClone
} from '../../utils/index.js'
import {
  isViemWalletClient,
  type AdaptViemWalletOptions
} from '../../utils/viemWallet.js'
import { getOrders } from './getOrders.js'

/** The order whose steps run, and the progress of those steps */
export type OrderProgressData = {
  order: Order
  steps: Execute['steps']
}

export type ExecuteOrderParameters = {
  order: Order
  wallet: AdaptedWallet | WalletClient
  onProgress?: (data: OrderProgressData) => void
} & AdaptViemWalletOptions

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
