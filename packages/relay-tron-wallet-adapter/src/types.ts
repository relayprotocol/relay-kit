// Minimal Transaction shape for TriggerSmartContract
export interface TronTriggerTransaction {
  visible?: boolean
  txID: string
  raw_data: {
    contract: Array<{
      parameter: {
        type_url: string
        value: {
          owner_address?: string // hex "41..."
          contract_address?: string // hex "41..."
          data?: string // ABI calldata
          call_value?: number
          call_token_value?: number
          token_id?: number
        }
      }
      type: 'TriggerSmartContract'
    }>
    ref_block_bytes: string
    ref_block_hash: string
    expiration: number
    fee_limit?: number
    timestamp?: number
  }
  raw_data_hex: string
  signature?: string[]
}

export interface TriggerSmartContractResponse {
  result: {
    result: boolean
    code?: string // error code when failed
    message?: string // hex-encoded, often needs Buffer->string
  }
  transaction?: TronTriggerTransaction // present when build succeeds
  energy_used?: number // sometimes included
  constant_result?: string[] // present if a constant view was executed
  logs?: any[]
  txid?: string // rarely present here (usually after broadcast)
}
