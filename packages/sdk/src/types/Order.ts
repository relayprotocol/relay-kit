export type OrderStatus =
  | 'pending'
  | 'open'
  | 'processing'
  | 'requires_action'
  | 'closed'

export type OrderOutcome =
  | 'filled'
  | 'refunded'
  | 'withdrawn'
  | 'cancelled'
  | 'expired'
  | 'failed'

export type OrderCancelReason = 'requested' | 'access_revoked'

export type OrderStepId = 'approve' | 'authorize' | 'cancel' | 'withdraw'

export type OrderCheckReason =
  | 'price_not_reached'
  | 'no_route'
  | 'insufficient_balance'
  | 'insufficient_allowance'

export type OrderCreateErrorCode =
  | 'INVALID_REQUEST_PARAMS'
  | 'INVALID_ADDRESS'
  | 'UNSUPPORTED_CURRENCY'
  | 'UNSUPPORTED_ROUTE'
  | 'AMOUNT_TOO_LOW'
  | 'NO_QUOTES'
  | 'INSUFFICIENT_FUNDS'
  | 'MAX_OPEN_ORDERS_REACHED'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'CLIENT_ORDER_ID_EXISTS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'UNKNOWN_ERROR'

export type OrderSponsoredFeeComponent =
  | 'execution'
  | 'swap'
  | 'relay'
  | 'app'
  | 'rent'

export type OrderAppFee = { recipient: string; fee: string }

/**
 * Body of `POST /orders`.
 * @property targetPrice - USD per unit of targetCurrency, all-in. Sell: minimum net proceeds per unit. Buy: maximum total cost per unit
 * @property amount - Base units of the currency spent: targetCurrency for a sell, settlementCurrency for a buy
 * @property expiresAt - RFC 3339 time, at least 15 minutes and at most 7 days from now
 * @property clientOrderId - The integrator's own id for the order; each id can be used once
 */
export type CreateOrderBody = {
  type: 'limit'
  user: string
  recipient?: string
  refundTo?: string
  side: 'buy' | 'sell'
  targetCurrency: string
  targetChainId: number
  settlementCurrency: string
  settlementChainId: number
  targetPrice: string
  amount: string
  expiresAt: string
  appFees?: OrderAppFee[]
  subsidizeFees?: boolean
  sponsoredFeeComponents?: OrderSponsoredFeeComponent[]
  maxSubsidizationAmount?: string
  subsidizationBps?: number
  clientOrderId?: string
}

export type OrderStep = {
  id: OrderStepId
  action: string
  description: string
  kind: 'transaction' | 'signature'
  status: 'incomplete' | 'complete'
  data: any
  check?: { endpoint: string; method: 'GET' | 'POST' }
}

export type OrderPriceCheck = {
  marketPrice: string | null
  allInPrice: string | null
  reason: OrderCheckReason | null
  checkedAt: string
}

export type Order = Omit<
  CreateOrderBody,
  'recipient' | 'refundTo' | 'clientOrderId'
> & {
  id: string
  clientOrderId: string | null
  orderHash: string
  status: OrderStatus
  outcome: OrderOutcome | null
  cancelReason: OrderCancelReason | null
  recipient: string
  refundTo: string
  originChainId: number
  originCurrency: string
  destinationChainId: number
  destinationCurrency: string
  fees: Record<string, unknown>
  createdAt: string
  updatedAt: string
  expiresAt: string
  closedAt: string | null
  requestIds: string[]
  filledAmount: string
  refundedAmount: string
  withdrawnAmount: string
  steps: OrderStep[]
  latestCheck: OrderPriceCheck | null
}

/**
 * Query of `GET /orders`.
 * @property status - Only orders in these statuses
 * @property startTimestamp - Unix seconds; filters on the sortBy field
 * @property endTimestamp - Unix seconds; filters on the sortBy field
 */
export type GetOrdersQuery = {
  orderId?: string
  appId?: string
  user?: string
  status?: OrderStatus[]
  originChainId?: number
  destinationChainId?: number
  limit?: number
  continuation?: string
  startTimestamp?: number
  endTimestamp?: number
  sortBy?: 'createdAt' | 'updatedAt'
  sortDirection?: 'asc' | 'desc'
}

export type GetOrdersResponse = { orders: Order[]; continuation?: string }
