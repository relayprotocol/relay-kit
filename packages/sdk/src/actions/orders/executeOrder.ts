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
import { isAlreadySigned } from './requestOrders.js'

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
 * order read with {@link getOrders}. An order that was already opened with the
 * same signature, such as by an earlier run, is read again instead of failing.
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
  let steps: Execute['steps'] = []
  let alreadySigned = false
  try {
    await executeSteps(
      order.originChainId,
      {},
      adaptedWallet,
      (data) => {
        steps = data.steps
        onProgress?.({ order, steps })
      },
      { steps: safeStructuredClone(order.steps) }
    )
  } catch (error) {
    if (!isAlreadySigned(error)) throw error
    alreadySigned = true
  }
  const { orders } = await getOrders({ orderId: order.id })
  if (!orders[0]) {
    throw new Error(
      `Order ${order.id} ran its steps but is not listed for this API key`
    )
  }
  if (alreadySigned) {
    steps = steps.map(({ error: _error, ...step }) =>
      step.id === 'authorize'
        ? {
            ...step,
            items: step.items.map(
              ({ error: _itemError, errorData: _errorData, ...item }) => ({
                ...item,
                status: 'complete' as const
              })
            )
          }
        : step
    )
    onProgress?.({ order: orders[0], steps })
  }
  return orders[0]
}
