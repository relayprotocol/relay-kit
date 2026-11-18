import type {
  SvmReceipt,
  TronReceipt,
  TonReceipt,
  LvmReceipt,
  XrpReceipt
} from '../types/index.js'
import type { paths } from './api.js'
import type { OrderStepId } from './Order.js'
import type { AxiosRequestConfig } from 'axios'
import type { TransactionReceipt } from 'viem'

type QuoteV2Response =
  paths['/quote/v2']['post']['responses']['200']['content']['application/json']
type RequestV3 = NonNullable<
  paths['/requests/v3']['get']['responses']['200']['content']['application/json']['requests']
>[0]

export type QuoteFee = { usd: string; amount: string; amountFormatted: string }
export type QuoteCurrencyAmount = NonNullable<
  NonNullable<QuoteV2Response['details']>['currencyIn']
>
export type QuoteFees = {
  execution?: QuoteFee
  swap?: QuoteFee
  platform?: QuoteFee
  app?: QuoteFee
  sponsored?: QuoteFee
  currency?: QuoteCurrencyAmount['currency']
}
export type QuoteFeeSponsorship = NonNullable<
  NonNullable<RequestV3['data']>['feeSponsorship']
>
export type DepositAddress = NonNullable<RequestV3['depositAddress']>
export type QuoteProtocol = QuoteV2Response['protocol']
// Inlined from the dropped /execute/swap schema; still returned on execute step payloads.
export type SwapBreakdown =
  | {
      value?: string
      timeEstimate?: number
    }[]
  | undefined
export type CheckApi = { endpoint?: string; method?: string }
export type QuoteDetails = Omit<
  NonNullable<QuoteV2Response['details']>,
  'expandedPriceImpact' | 'rate' | 'userBalance'
> & {
  rate?: string
  userBalance?: string
}
export type QuoteStepId = 'deposit' | 'approve' | 'authorize' | 'swap' | 'send'

export type TransactionStepState = 'confirming' | 'validating' | 'complete'
export type SignatureStepState =
  | 'signing'
  | 'posting'
  | 'validating'
  | 'complete'

export type Execute = {
  errors?: { message?: string; orderId?: string }[]
  fees?: QuoteFees
  originGas?: QuoteCurrencyAmount
  feeSponsorship?: QuoteFeeSponsorship
  protocol?: QuoteProtocol
  breakdown?: SwapBreakdown
  details?: QuoteDetails
  error?: any // Manually added client error
  refunded?: boolean
  requestId?: string

  steps: {
    error?: string
    errorData?: any
    action: string
    description: string
    kind: 'transaction' | 'signature'
    id: QuoteStepId
    requestId?: string
    depositAddress?: DepositAddress
    depositAddressId?: string
    items: {
      status: 'complete' | 'incomplete'
      receipt?:
        | TransactionReceipt
        | SvmReceipt
        | TronReceipt
        | TonReceipt
        | LvmReceipt
        | XrpReceipt
      checkStatus?:
        | 'refund'
        | 'waiting'
        | 'failure'
        | 'pending'
        | 'submitted'
        | 'success'
        | 'unknown'
      progressState?: TransactionStepState | SignatureStepState
      data?: any
      check?: CheckApi
      orderIndexes?: number[]
      orderIds?: string[]
      // Manually added
      error?: string
      txHashes?: {
        txHash: string
        chainId: number
        isBatchTx?: boolean
      }[]
      internalTxHashes?: {
        txHash: string
        chainId: number
        isBatchTx?: boolean
      }[]
      errorData?: any
      orderData?: {
        crossPostingOrderId?: string
        orderId: string
        orderIndex: string
      }[]
      isValidatingSignature?: boolean
    }[]
  }[]

  //Manually added request parameters that fetched the data
  request?: AxiosRequestConfig
}

export type ExecuteStep = NonNullable<Execute['steps']>['0']
export type ExecuteStepItem = NonNullable<Execute['steps'][0]['items']>[0]

/** A quote/v3 or Orders API step: `status`, `data` and `check` sit on the step instead of in `items` */
export type FlatExecuteStep = Omit<ExecuteStep, 'items' | 'id'> & {
  id: QuoteStepId | OrderStepId
} & Pick<ExecuteStepItem, 'status' | 'data' | 'check'>

/** A step as POST /quote/v3 returns it */
export type QuoteStep = Omit<FlatExecuteStep, 'id' | 'requestId'> & {
  id: QuoteStepId
}

/** A POST /quote/v3 response, as returned by `getQuote` and `useQuote` */
export type Quote = Omit<Execute, 'steps'> & {
  steps: QuoteStep[]
}
