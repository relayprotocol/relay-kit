import {
  type AdaptedWallet,
  LogLevel,
  getClient
} from '@relayprotocol/relay-sdk'
import type { XrpPaymentTransaction, XrpSendTransaction } from './types.js'

// Relay's numeric chainId for XRP Ledger mainnet.
export const XRP_CHAIN_ID = 537724

const CONFIRM_POLL_MS = 2000
const CONFIRM_TIMEOUT_MS = 120_000

export type AdaptXrpWalletOptions = {
  // XRPL JSON-RPC endpoint. Defaults to the chain's `httpRpcUrl` in the Relay client.
  rpcUrl?: string
}

/**
 * Adapts an XRP Ledger wallet for use with the Relay SDK.
 *
 * The adapter never signs. It builds an XRPL Payment from the Relay quote step,
 * hands it to the wallet-provided `sendTransaction` callback (which signs and
 * submits it), then polls the XRPL until the transaction is validated.
 *
 * @param walletAddress - The connected wallet's classic address (r...).
 * @param sendTransaction - Wallet callback that signs + submits a Payment and resolves with its hash.
 * @param options - Optional settings, e.g. `rpcUrl` to override the chain's RPC.
 */
export const adaptXrpWallet = (
  walletAddress: string,
  sendTransaction: XrpSendTransaction,
  options: AdaptXrpWalletOptions = {}
): AdaptedWallet => {
  if (typeof sendTransaction !== 'function') {
    throw new Error('adaptXrpWallet requires a sendTransaction function')
  }
  const getRpcUrl = (chainId: number) => {
    const rpcUrl =
      options.rpcUrl ??
      getClient().chains.find((chain) => chain.id === chainId)?.httpRpcUrl
    if (!rpcUrl) {
      throw new Error(
        `No XRP httpRpcUrl configured for chainId ${chainId} in the Relay client`
      )
    }
    return rpcUrl
  }

  return {
    vmType: 'xrpvm',
    getChainId: async () => XRP_CHAIN_ID,
    address: async () => walletAddress,
    handleSignMessageStep: async () => {
      throw new Error('Message signing not implemented for XRP')
    },
    handleSendTransactionStep: async (_chainId, stepItem) => {
      const client = getClient()
      const { to, amount, currency, memo } = stepItem.data

      // Only native XRP payments (amount in drops) are supported.
      if (currency !== 'xrp') {
        throw new Error(`Unsupported XRP step currency: ${currency}`)
      }
      if (!to || !amount) {
        throw new Error('XRP transaction step is missing to or amount')
      }

      const transaction: XrpPaymentTransaction = {
        TransactionType: 'Payment',
        Account: walletAddress,
        Destination: to,
        Amount: amount,
        ...(memo
          ? {
              Memos: [
                {
                  Memo: {
                    MemoData: Array.from(new TextEncoder().encode(memo), (b) =>
                      b.toString(16).padStart(2, '0')
                    )
                      .join('')
                      .toUpperCase()
                  }
                }
              ]
            }
          : {})
      }

      client.log(['Sending XRP transaction', transaction], LogLevel.Verbose)

      const hash = await sendTransaction(transaction)
      if (!hash) {
        throw new Error('No transaction hash returned from the XRP wallet')
      }

      client.log(['XRP transaction submitted', hash], LogLevel.Verbose)
      return hash
    },
    handleConfirmTransactionStep: async (txHash, chainId) => {
      const client = getClient()
      const rpcUrl = getRpcUrl(chainId)
      const start = Date.now()

      // Poll `tx` until the transaction is in a validated ledger. RPC errors,
      // `txnNotFound` and rate limits are retried until the timeout.
      while (Date.now() - start < CONFIRM_TIMEOUT_MS) {
        let result:
          | {
              hash?: string
              validated?: boolean
              ledger_index?: number
              meta?: { TransactionResult?: string }
            }
          | undefined
        try {
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'tx',
              params: [{ transaction: txHash }]
            })
          })
          result = (await response.json())?.result
        } catch (error) {
          client.log(
            ['Error polling for XRP transaction', error],
            LogLevel.Verbose
          )
        }

        if (result?.validated === true) {
          const code = result.meta?.TransactionResult
          if (code !== 'tesSUCCESS') {
            throw new Error(`XRP transaction failed: ${code}`)
          }
          return {
            hash: result.hash ?? txHash,
            ledgerIndex: result.ledger_index
          }
        }
        await new Promise((resolve) => setTimeout(resolve, CONFIRM_POLL_MS))
      }

      throw new Error('XRP transaction confirmation timed out')
    },
    getBalance: async (chainId, address, tokenAddress) => {
      // Native XRP only; the balance includes the account reserve.
      if (tokenAddress && tokenAddress !== 'xrp') {
        return undefined
      }
      const response = await fetch(getRpcUrl(chainId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_info',
          params: [{ account: address, ledger_index: 'validated' }]
        })
      })
      const result = (await response.json())?.result
      // An unfunded account does not exist on the ledger yet.
      if (result?.error === 'actNotFound') {
        return 0n
      }
      const balance = result?.account_data?.Balance
      return typeof balance === 'string' ? BigInt(balance) : undefined
    },
    switchChain: () => Promise.resolve()
  }
}
