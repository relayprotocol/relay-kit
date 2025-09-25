import type { SvmReceipt, SuiReceipt } from '../types/index.js'
import type { paths } from './api.js'
import type { AxiosRequestConfig } from 'axios'
import type { TransactionReceipt } from 'viem'

export type CallFees =
  paths['/execute/call/v2']['post']['responses']['200']['content']['application/json']['fees']
export type CallBreakdown =
  paths['/execute/call/v2']['post']['responses']['200']['content']['application/json']['breakdown']
export type CheckApi = NonNullable<
  NonNullable<
    paths['/execute/call/v2']['post']['responses']['200']['content']['application/json']['steps']
  >['0']['items']
>[0]['check']
export type QuoteDetails = NonNullable<
  paths['/quote']['post']['responses']['200']['content']['application/json']['details']
>
export type QuoteStepId = NonNullable<
  paths['/quote']['post']['responses']['200']['content']['application/json']['steps']
>['0']['id']

export type TransactionStepState =
  | 'confirming'
  | 'validating'
  | 'validating_delayed'
  | 'complete'
export type SignatureStepState =
  | 'signing'
  | 'posting'
  | 'validating'
  | 'validating_delayed'
  | 'complete'

export type Execute = {
  errors?: { message?: string; orderId?: string }[]
  fees?: CallFees
  breakdown?: CallBreakdown
  details?: QuoteDetails
  error?: any // Manually added client error
  refunded?: boolean

  steps: {
    error?: string
    errorData?: any
    action: string
    description: string
    kind: 'transaction' | 'signature'
    id: QuoteStepId
    requestId?: string
    depositAddress?: string
    items: {
      status: 'complete' | 'incomplete'
      receipt?: TransactionReceipt | SvmReceipt | SuiReceipt
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
