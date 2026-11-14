import type { GetOrdersQuery, GetOrdersResponse } from '../../types/index.js'
import { requestOrders } from './requestOrders.js'

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
