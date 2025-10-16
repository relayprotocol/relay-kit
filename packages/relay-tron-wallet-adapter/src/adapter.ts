import { TronWeb } from 'tronweb'
import {
  getClient,
  LogLevel,
  // LogLevel,
  // getClient,
  type AdaptedWallet
  // type TransactionStepItem
} from '@relayprotocol/relay-sdk'
import type { TriggerSmartContractResponse } from './types.js'

/**
 * Adapts a Tron wallet to work with the Relay SDK
 * @param walletAddress - The public key address of the Tron wallet
 * @param chainId - The chain ID for the Tron network (e.g., 101 for mainnet, 102 for testnet)
 * @param connection - The Tron web3.js Connection instance for interacting with the network
 * @param signAndSendTransaction - Function to sign and send a transaction, returning a promise with the transaction signature
 * @param payerKey - Optional public key of the account that will pay for transaction fees (defaults to walletAddress)
 * @returns An AdaptedWallet object that conforms to the Relay SDK interface
 */
export const adaptTronWallet = (walletAddress: string): AdaptedWallet => {
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
      const tronWeb = new TronWeb({
        fullHost: 'https://api.trongrid.io'
      })

      if (!walletAddress) throw new Error('No wallet address provided')
      // Safety: ensure the connected wallet matches owner, or override with the connected wallet
      const ownerHex = tronWeb.address.toHex(walletAddress)

      // TRON node expects hex strings WITHOUT "0x"
      const strip0x = (s: string) => (s.startsWith('0x') ? s.slice(2) : s)

      const body = {
        owner_address: ownerHex,
        contract_address: stepItem.data.parameter?.contract_address,
        data: strip0x(stepItem.data.parameter?.data!),
        visible: false // using hex addresses, not base58
      }

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
      const tronWeb = new TronWeb({
        fullHost: 'https://api.trongrid.io'
      })

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
