import type { CustomTransport, HttpTransport, TransactionReceipt } from 'viem'
import type { Execute } from './Execute.js'
import type { SignatureStepItem } from './SignatureStepItem.js'
import type { TransactionStepItem } from './TransactionStepItem.js'
import type { ChainVM } from './RelayChain.js'

export type SvmReceipt = {
  blockHash: string
  blockNumber: number
  txHash: string
}

export type SuiReceipt = {
  digest: string
}

type HTTPMap<T extends string | number | symbol, U> = Record<T, U>[]
export type TronReceipt = {
  id: string
  fee: number
  blockNumber: number
  blockTimeStamp: number
  contractResult: string[]
  contract_address: string
  receipt: {
    energy_usage: number
    energy_fee: number
    origin_energy_usage: number
    energy_usage_total: number
    net_usage: number
    net_fee: number
    result: string
    energy_penalty_total: number
  }
  log: {
    address: string
    topics: string[]
    data: string
  }[]
  result?: 'FAILED'
  resMessage: string
  assetIssueID: string
  withdraw_amount: number
  unfreeze_amount: number
  internal_transactions: {
    hash: string
    caller_address: string
    transferTo_address: string
    callValueInfo: {
      callValue: number
      tokenId: string
    }[]
    note: string
    rejected: boolean
    extra: string
  }[]
  exchange_received_amount: number
  exchange_inject_another_amount: number
  exchange_withdraw_another_amount: number
  shielded_transaction_fee: number
  withdraw_expire_amount: number
  cancel_unfreezeV2_amount: HTTPMap<string, number>
  exchange_id: string
  orderId: string
  orderDetails: {
    makerOrderId: string
    takerOrderId: string
    fillSellQuantity: number
    fillBuyQuantity: number
  }[]
  packingFee: number
}

export type BitcoinWalletMetadata = {
  publicKey?: string
}

export type AdaptedWallet = {
  vmType: ChainVM
  metadata?: BitcoinWalletMetadata
  getChainId: () => Promise<number>
  handleSignMessageStep: (
    item: SignatureStepItem,
    step: Execute['steps'][0]
  ) => Promise<string | undefined>
  handleSendTransactionStep: (
    chainId: number,
    item: TransactionStepItem,
    step: Execute['steps'][0]
  ) => Promise<string | undefined>
  handleConfirmTransactionStep: (
    tx: string,
    chainId: number,
    onReplaced: (replacementTxHash: string) => void,
    onCancelled: () => void
  ) => Promise<
    | TransactionReceipt // evm
    | SvmReceipt // svm
    | SuiReceipt // suivm
    | TronReceipt // tvm
  >
  address: () => Promise<string>
  switchChain: (chainId: number) => Promise<void>
  transport?: CustomTransport | HttpTransport
  getBalance?: (
    chainId: number,
    walletAddress: string,
    tokenAddress?: string
  ) => Promise<bigint | undefined>
  // evm wallets that support EIP-5792's atomic batch capability
  // https://www.eip5792.xyz/capabilities/atomicBatch
  supportsAtomicBatch?: (chainId: number) => Promise<boolean>
  handleBatchTransactionStep?: (
    chainId: number,
    items: TransactionStepItem[]
  ) => Promise<string | undefined>
  // detect if wallet is an EOA (externally owned account)
  isEOA?: (
    chainId: number
  ) => Promise<{ isEOA: boolean; isEIP7702Delegated: boolean }>
}
