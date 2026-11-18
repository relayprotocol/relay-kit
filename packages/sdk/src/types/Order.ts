import type { paths } from './api.js'

type OrdersRoute = paths['/orders']
type ListOrdersResponse =
  OrdersRoute['get']['responses']['200']['content']['application/json']
type ApiOrder = ListOrdersResponse['orders'][number]
type ApiOrderStep = NonNullable<ApiOrder['steps']>[number]
type ApiPriceCheck = NonNullable<ApiOrder['latestPriceCheck']>

/** Body of `POST /orders`. */
export type CreateOrderBody =
  OrdersRoute['post']['requestBody']['content']['application/json']

export type OrderStatus = NonNullable<ApiOrder['status']>

export type OrderOutcome = NonNullable<ApiOrder['outcome']>

export type OrderCancelReason = NonNullable<ApiOrder['cancellationReason']>

export type OrderRequiredAction = NonNullable<ApiOrder['requiredAction']>

export type OrderStepId = NonNullable<ApiOrderStep['id']>

export type OrderCheckReason = NonNullable<ApiPriceCheck['reason']>

export type OrderCreateErrorCode = NonNullable<
  OrdersRoute['post']['responses']['400']['content']['application/json']['errorCode']
>

export type OrderSponsoredFeeComponent = NonNullable<
  CreateOrderBody['sponsoredFeeComponents']
>[number]

export type OrderAppFee = NonNullable<CreateOrderBody['appFees']>[number]

export type OrderStep = Required<Omit<ApiOrderStep, 'data' | 'check'>> & {
  data: any
  check?: { endpoint: string; method: 'GET' | 'POST' }
}

export type OrderPriceCheck = Required<ApiPriceCheck>

type OptionalOrderField =
  | 'appFees'
  | 'subsidizeFees'
  | 'sponsoredFeeComponents'
  | 'maxSubsidizationAmount'
  | 'subsidizationBps'

/**
 * An order as the Orders API returns it.
 * @property latestPriceCheck - Its `reason` is the first of `insufficient_balance`, `insufficient_allowance`, `no_route` and `price_not_reached` that stopped a fill, or null when nothing did
 */
export type Order = Required<
  Omit<
    ApiOrder,
    OptionalOrderField | 'steps' | 'latestPriceCheck' | 'closestPriceCheck'
  >
> &
  Pick<CreateOrderBody, OptionalOrderField> & {
    steps: OrderStep[]
    latestPriceCheck: OrderPriceCheck | null
    closestPriceCheck: OrderPriceCheck | null
  }

/** Query of `GET /orders`, with `status` as a list instead of a comma-separated string. */
export type GetOrdersQuery = Omit<
  NonNullable<OrdersRoute['get']['parameters']['query']>,
  'status'
> & { status?: OrderStatus[] }

export type GetOrdersResponse = Omit<ListOrdersResponse, 'orders'> & {
  orders: Order[]
}
