import type { Execute } from './Execute.js'

export type TransactionStepItem = Pick<
  NonNullable<Execute['steps'][0]['items']>[0],
  | 'status'
  | 'orderIds'
  | 'orderIndexes'
  | 'orderData'
  | 'check'
  | 'progressState'
  | 'txHashes'
  | 'internalTxHashes'
  | 'receipt'
  | 'checkStatus'
> & {
  data: {
    chainId?: number
    data: any
    from: `0x${string}`
    to: `0x${string}`
    value: string
    maxFeePerGas?: string
    maxPriorityFeePerGas?: string
    gas?: string
    // Solana
    instructions?: {
      keys: {
        pubkey: string
        isSigner: boolean
        isWritable: boolean
      }[]
      programId: string
      data: string
    }[]
    //Bitcoin
    addressLookupTableAddresses?: string[]
    psbt?: string
    // Tron
    parameter?: {
      owner_address: string
      contract_address: string
      data: string
    }
    type?: string
  }
}
