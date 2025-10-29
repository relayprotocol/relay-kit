import { TronWeb } from 'tronweb'
import {
  getClient,
  LogLevel,
  type AdaptedWallet
} from '@relayprotocol/relay-sdk'
import type { TriggerSmartContractResponse } from './types.js'

/**
 * Adapts a Tron wallet to work with the Relay SDK
 * @param walletAddress - The public key address of the Tron wallet
 * @param tronWeb - The TronWeb instance for interacting with the Tron network
 * @returns An AdaptedWallet object that conforms to the Relay SDK interface
 */
export const adaptTronWallet = (
  walletAddress: string,
  tronWeb: TronWeb
): AdaptedWallet => {
  const getChainId = async () => {
    return 728126428
  }

  return {
    vmType: 'tvm',
    getChainId,
    address: async () => {
      return walletAddress
    },
    handleSignMessageStep: async () => {
      throw new Error('Message signing not implemented for Tron')
    },
    handleSendTransactionStep: async (_chainId, stepItem) => {
      const client = getClient()

      if (!walletAddress) throw new Error('No wallet address provided')

      // TRON node expects hex strings WITHOUT "0x"
      const strip0x = (s: string) => (s.startsWith('0x') ? s.slice(2) : s)

      const body = {
        owner_address: stepItem.data.parameter?.owner_address,
        contract_address: stepItem.data.parameter?.contract_address,
        data: strip0x(stepItem.data.parameter?.data!),
        visible: false,
        fee_limit: 30_000_000
      }

      client.log(['Building Tron Transaction', body], LogLevel.Verbose)

      // 1) Ask the node to build the transaction from raw calldata
      const res = await tronWeb.fullNode.request<TriggerSmartContractResponse>(
        'wallet/triggersmartcontract',
        body,
        'post'
      )
      if (!res?.transaction) {
        const reason = res?.result?.message
          ? Buffer.from(res.result.message, 'hex').toString()
          : 'Unknown trigger error'
        throw new Error(`Trigger failed: ${reason}`)
      }

      //2) Send the transaction
      const signed = await tronWeb.trx.sign(res.transaction as any)
      const receipt = await tronWeb.trx.sendRawTransaction(signed)

      client.log(['Tron Transaction Broadcasted', receipt], LogLevel.Verbose)

      return receipt?.txid || signed?.txID || res?.transaction?.txID
    },
    handleConfirmTransactionStep: async (txId) => {
      const pollMs = 1500
      const timeoutMs = 60_000
      const targetConfs = 1

      const start = Date.now()
      const getTip = async () =>
        (await tronWeb.trx.getCurrentBlock())?.block_header?.raw_data?.number ??
        0

      while (true) {
        // 1) Ask for the execution receipt (appears once included in a block)
        const info = await tronWeb.trx
          .getTransactionInfo(txId)
          .catch(() => undefined)

        if (info && typeof info.blockNumber === 'number') {
          const tip = await getTip()
          const confirmations = Math.max(0, tip - info.blockNumber + 1)

          // execution result: 'SUCCESS' or an error like 'OUT_OF_ENERGY'
          const result = info.receipt?.result as string | undefined
          const success = result === 'SUCCESS'

          // 2) Return once we have enough confirmations
          if (confirmations >= targetConfs) {
            if (success) {
              return info
            } else {
              throw new Error(`Transaction reverted: ${result}`)
            }
          }
          // Not enough confs yet — keep polling (even if reverted; caller may still want N confs)
        }

        if (Date.now() - start > timeoutMs) {
          throw new Error('Transaction confirmation timed out')
        }

        await new Promise((r) => setTimeout(r, pollMs))
      }
    },
    switchChain: (_chainId: number) => {
      return new Promise((res) => res())
    }
  }
}
