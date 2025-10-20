import type { TransactionReceipt } from 'viem'
import type { SvmReceipt, SuiReceipt, TronReceipt } from '../types/index.js'
import type { TenderlyErrorInfo } from '../utils/getTenderlyDetails.js'

export class TransactionConfirmationError extends Error {
  receipt:
    | TransactionReceipt
    | SvmReceipt
    | SuiReceipt
    | TronReceipt
    | undefined
  tenderlyError: TenderlyErrorInfo | undefined

  constructor(
    error: any,
    receipt?: TransactionReceipt | SvmReceipt | SuiReceipt | TronReceipt,
    tenderlyError?: TenderlyErrorInfo | null
  ) {
    super(error)
    this.name = 'TransactionConfirmationError'
    this.receipt = receipt
    this.tenderlyError = tenderlyError ?? undefined
  }
}
