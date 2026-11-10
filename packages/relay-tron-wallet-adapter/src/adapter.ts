import { TronWeb } from 'tronweb'
import {
  getClient,
  LogLevel,
  type AdaptedWallet
} from '@relayprotocol/relay-sdk'

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

      const ownerAddress = stepItem.data.parameter?.owner_address
      const contractAddress = stepItem.data.parameter?.contract_address
      const options = {
        input: strip0x(stepItem.data.parameter?.data!),
        // Native TRX amount rides in call_value, not calldata
        callValue: stepItem.data.parameter?.call_value ?? 0,
        feeLimit: 30_000_000
      }

      client.log(
        [
          'Building Tron Transaction',
          { ownerAddress, contractAddress, ...options }
        ],
        LogLevel.Verbose
      )

      // 1) Build via the node. tronweb rebuilds the transaction from these
      // args and throws if the node's reply doesn't match before we sign it.
      const res = await tronWeb.transactionBuilder.triggerSmartContract(
        contractAddress!,
        '',
        options,
        [],
        ownerAddress
      )

      //2) Send the transaction
      const signed = await tronWeb.trx.sign(res.transaction)
      const receipt = await tronWeb.trx.sendRawTransaction(signed)

      // A rejected broadcast resolves with `result` unset and an error code
      // (e.g. TRANSACTION_EXPIRATION_ERROR) instead of throwing. A duplicate
      // means the node already has this transaction, so it still goes on to
      // confirmation.
      const code = String(receipt?.code ?? '')
      const isDuplicate = code === 'DUP_TRANSACTION_ERROR' || code === '5'
      if (!receipt?.result && !isDuplicate) {
        // `message` is usually hex encoded; when it is not, the decode comes
        // back empty, so fall back to the code.
        const decoded = receipt?.message
          ? Buffer.from(receipt.message, 'hex').toString()
          : ''
        const reason = decoded || code || 'Unknown broadcast error'
        throw new Error(`Broadcast failed: ${reason}`)
      }

      client.log(['Tron Transaction Broadcasted', receipt], LogLevel.Verbose)

      return receipt?.txid || signed?.txID || res.transaction.txID
    },
    handleConfirmTransactionStep: async (txId) => {
      const pollMs = 1500
      const timeoutMs = 90_000
      const targetConfs = 1

      const start = Date.now()
      const getTip = async () =>
        (await tronWeb.trx.getCurrentBlock())?.block_header?.raw_data?.number ??
        0

      while (true) {
        // 1) Ask for the execution receipt (appears once included in a block).
        // Fullnode variant: the solidity node only serves it after solidification (~57s).
        const info = await tronWeb.trx
          .getUnconfirmedTransactionInfo(txId)
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
