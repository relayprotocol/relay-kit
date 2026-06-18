import {
  type AdaptedWallet,
  LogLevel,
  getClient
} from '@relayprotocol/relay-sdk'
import { TonClient } from '@ton/ton'
import { Address, Cell, beginCell, storeMessage } from '@ton/core'
import type {
  AdaptTonWalletOptions,
  TonConnectTransactionRequest,
  TonSendTransaction
} from './types.js'

// TON Connect CHAIN identifier for mainnet (Relay only supports TON mainnet).
const TON_MAINNET_CHAIN = '-239'
// Public TON HTTP API used for confirmation reads. The Relay chain's httpRpcUrl
// points at a gateway that doesn't reliably serve these reads, so we default to
// toncenter (overridable via `options`).
const DEFAULT_TON_RPC = 'https://toncenter.com/api/v2/jsonRPC'

const DEFAULT_VALID_FOR_SECONDS = 300
const CONFIRM_POLL_MS = 2000
const CONFIRM_TIMEOUT_MS = 120_000
const CONFIRM_TX_LOOKBACK = 16

/**
 * Adapts a TON wallet for use with the Relay SDK.
 *
 * The user's key lives in their wallet (e.g. Dynamic / TON Connect), so this
 * adapter never signs. It maps the Relay quote step into a TON Connect request,
 * hands it to the wallet-provided `sendTransaction` callback (which signs +
 * broadcasts), and then confirms the origin transaction landed successfully.
 *
 * @param walletAddress - The connected wallet's address.
 * @param chainId - The Relay numeric chainId for the TON network.
 * @param sendTransaction - Wallet callback that signs + broadcasts a request.
 * @param options - Optional read client / endpoint configuration.
 */
export const adaptTonWallet = (
  walletAddress: string,
  chainId: number,
  sendTransaction: TonSendTransaction,
  options?: AdaptTonWalletOptions
): AdaptedWallet => {
  let _chainId = chainId
  let _client = options?.client

  const getReadClient = (): TonClient => {
    if (!_client) {
      _client = new TonClient({
        endpoint: options?.endpoint ?? DEFAULT_TON_RPC
      })
    }
    return _client
  }

  return {
    vmType: 'tonvm',
    getChainId: async () => _chainId,
    address: async () => walletAddress,
    handleSignMessageStep: async () => {
      // Mirrors the Tron and Sui adapters — not needed for deposit/bridge flows.
      throw new Error('Message signing not implemented for TON')
    },
    handleSendTransactionStep: async (_chainId, stepItem) => {
      const client = getClient()

      const messages = stepItem.data.messages
      if (!messages || messages.length === 0) {
        throw new Error('TON transaction step is missing messages')
      }

      // Relay returns internal-message fields (to/value/body); map them to the
      // TON Connect request shape the wallet expects (address/amount/payload).
      const request: TonConnectTransactionRequest = {
        validUntil: Math.floor(Date.now() / 1000) + DEFAULT_VALID_FOR_SECONDS,
        network: TON_MAINNET_CHAIN,
        messages: messages.map((message) => ({
          address: message.to,
          amount: message.value,
          payload: message.body,
          stateInit: message.stateInit
        }))
      }

      client.log(['Sending TON transaction', request], LogLevel.Verbose)

      const result = await sendTransaction(request)
      // The wallet returns the signed external-message BOC (base64).
      const boc = result.boc ?? result.transactionHash
      if (!boc) {
        throw new Error('No result returned from the TON wallet')
      }

      client.log(['TON transaction submitted', boc], LogLevel.Verbose)
      return boc
    },
    handleConfirmTransactionStep: async (boc) => {
      const client = getClient()
      const tonClient = getReadClient()
      const account = Address.parse(walletAddress)

      // `boc` is the signed external message; its cell hash equals the inbound
      // message hash of the transaction it produces. Poll the wallet's recent
      // transactions for that one and confirm the origin (deposit) succeeded.
      const externalMessageHash = toMessageHash(boc)
      const start = Date.now()

      while (true) {
        let match:
          | { hash: string; lt: string; description: unknown }
          | undefined
        try {
          const transactions = await tonClient.getTransactions(account, {
            limit: CONFIRM_TX_LOOKBACK
          })
          for (const tx of transactions) {
            if (!tx.inMessage) {
              continue
            }
            const inMessageHash = beginCell()
              .store(storeMessage(tx.inMessage))
              .endCell()
              .hash()
              .toString('hex')
            if (inMessageHash === externalMessageHash) {
              match = {
                hash: tx.hash().toString('hex'),
                lt: tx.lt.toString(),
                description: tx.description
              }
              break
            }
          }
        } catch (error) {
          client.log(
            ['Error polling for TON transaction', error],
            LogLevel.Verbose
          )
        }

        if (match) {
          if (!isTransactionSuccessful(match.description)) {
            throw new Error('TON transaction failed')
          }
          return { hash: match.hash, lt: match.lt }
        }
        if (Date.now() - start > CONFIRM_TIMEOUT_MS) {
          throw new Error('TON transaction confirmation timed out')
        }
        await new Promise((resolve) => setTimeout(resolve, CONFIRM_POLL_MS))
      }
    },
    switchChain: (chainId: number) => {
      _chainId = chainId
      return Promise.resolve()
    }
  }
}

/**
 * The wallet returns the external-message BOC (base64); its root cell hash is
 * the message hash. Falls back to treating the input as an existing hex hash.
 */
const toMessageHash = (boc: string): string => {
  try {
    return Cell.fromBase64(boc).hash().toString('hex')
  } catch {
    return boc.trim().replace(/^0x/, '').toLowerCase()
  }
}

/**
 * Origin success: the external message executed (compute phase ok) and the
 * wallet emitted its action. Uses a loose shape because @ton/core's phase types
 * are broad; only an explicit failure is treated as failed.
 */
const isTransactionSuccessful = (description: unknown): boolean => {
  const desc = description as {
    type?: string
    computePhase?: { type?: string; success?: boolean }
    actionPhase?: { success?: boolean } | null
  }
  if (desc?.type !== 'generic') {
    return true
  }
  const computeOk =
    desc.computePhase?.type === 'vm' ? desc.computePhase.success !== false : true
  const actionOk = desc.actionPhase ? desc.actionPhase.success !== false : true
  return computeOk && actionOk
}
