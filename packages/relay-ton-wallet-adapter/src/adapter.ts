import {
  type AdaptedWallet,
  LogLevel,
  getClient
} from '@relayprotocol/relay-sdk'
import { TonClient } from '@ton/ton'
import {
  Address,
  Cell,
  beginCell,
  loadMessage,
  storeMessage,
  type Message
} from '@ton/core'
import type {
  AdaptTonWalletOptions,
  TonConnectTransactionRequest,
  TonSendTransaction
} from './types.js'

// TON Connect CHAIN identifier for mainnet (Relay only supports TON mainnet).
const TON_MAINNET_CHAIN = '-239'
// Relay's numeric chainId for TON mainnet. TON is single-chain for Relay, so
// the adapter owns this rather than taking it as a parameter.
const TON_CHAIN_ID = 224235520
// Public TON HTTP API used for confirmation reads. The Relay chain's httpRpcUrl
// points at a gateway that doesn't reliably serve these reads, so we default to
// toncenter (overridable via `options`).
const DEFAULT_TON_RPC = 'https://toncenter.com/api/v2/jsonRPC'

const DEFAULT_VALID_FOR_SECONDS = 300
const CONFIRM_POLL_MS = 2000
const CONFIRM_TIMEOUT_MS = 120_000
const CONFIRM_TX_LOOKBACK = 32

/**
 * Adapts a TON wallet for use with the Relay SDK.
 *
 * The user's key lives in their wallet (e.g. Dynamic / TON Connect), so this
 * adapter never signs. It maps the Relay quote step into a TON Connect request,
 * hands it to the wallet-provided `sendTransaction` callback (which signs +
 * broadcasts), and then confirms the origin transaction landed successfully.
 *
 * @param walletAddress - The connected wallet's address.
 * @param sendTransaction - Wallet callback that signs + broadcasts a request.
 * @param options - Optional read client / endpoint configuration.
 */
export const adaptTonWallet = (
  walletAddress: string,
  sendTransaction: TonSendTransaction,
  options?: AdaptTonWalletOptions
): AdaptedWallet => {
  if (typeof sendTransaction !== 'function') {
    throw new Error('adaptTonWallet requires a sendTransaction function')
  }
  // Parse (and validate) the wallet address once, then reuse it for confirmation.
  const walletAccount = Address.parse(walletAddress)
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
    getChainId: async () => TON_CHAIN_ID,
    address: async () => walletAddress,
    handleSignMessageStep: async () => {
      // Not used by deposit/bridge flows; mirrors the other VM adapters.
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
      // TON Connect has no per-message bounce flag — the wallet derives it from
      // the address form — so honor the step's `bounce` field by re-encoding the
      // address (e.g. bounce:false -> non-bounceable `UQ…`). Sending a deposit
      // to the bounceable form makes the depository bounce the funds back.
      const request: TonConnectTransactionRequest = {
        validUntil: Math.floor(Date.now() / 1000) + DEFAULT_VALID_FOR_SECONDS,
        network: TON_MAINNET_CHAIN,
        messages: messages.map((message) => ({
          address: encodeAddress(message.to, message.bounce),
          amount: message.value.toString(),
          ...(message.body ? { payload: message.body } : {}),
          ...(message.stateInit ? { stateInit: message.stateInit } : {})
        }))
      }

      client.log(['Sending TON transaction', request], LogLevel.Verbose)

      const result = await sendTransaction(request)
      // The wallet returns the signed external-message BOC (base64). Reduce it
      // to the external-message hash so callers get a clean identifier (the raw
      // BOC mangles explorer URLs) that also matches the on-chain transaction.
      const boc = result.boc ?? result.transactionHash
      if (!boc) {
        throw new Error('No result returned from the TON wallet')
      }
      const messageHash = toMessageHash(boc, walletAccount)

      client.log(['TON transaction submitted', messageHash], LogLevel.Verbose)
      return messageHash
    },
    handleConfirmTransactionStep: async (externalMessageHash) => {
      const client = getClient()
      const tonClient = getReadClient()

      // `handleSendTransactionStep` returns the external-message hash, which
      // equals the inbound message hash of the transaction it produces. Poll the
      // wallet's recent transactions for that one and confirm the origin
      // (deposit) executed successfully. This confirms the wallet's external-in
      // transaction; it does not independently verify each emitted internal
      // message against the Relay step.
      const start = Date.now()

      while (true) {
        let match:
          | { hash: string; lt: string; description: unknown }
          | undefined
        try {
          const transactions = await tonClient.getTransactions(walletAccount, {
            limit: CONFIRM_TX_LOOKBACK
          })
          for (const tx of transactions) {
            if (!tx.inMessage) {
              continue
            }
            if (hashMessage(tx.inMessage) === externalMessageHash) {
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
            client.log(
              ['TON transaction failed', match.description],
              LogLevel.Verbose
            )
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
    switchChain: () => Promise.resolve()
  }
}

/** Canonical message hash, used identically for the BOC and on-chain messages. */
const hashMessage = (message: Message): string => {
  return beginCell().store(storeMessage(message)).endCell().hash().toString('hex')
}

/**
 * Reduce the wallet's result to the external-message hash. The wallet returns
 * the signed external-message BOC; we parse it as a message and hash it via the
 * same `hashMessage` used on-chain (so both sides use identical serialization).
 * Validates it's an external-in message addressed to the expected wallet. Falls
 * back only when the input is already a 64-char hex hash.
 */
const toMessageHash = (bocOrHash: string, expectedWallet?: Address): string => {
  try {
    const message = loadMessage(Cell.fromBase64(bocOrHash).beginParse())
    if (message.info.type !== 'external-in') {
      throw new Error(`Expected an external-in message, got ${message.info.type}`)
    }
    if (expectedWallet && !message.info.dest.equals(expectedWallet)) {
      throw new Error('TON wallet returned a BOC for an unexpected account')
    }
    return hashMessage(message)
  } catch (error) {
    const normalized = bocOrHash.trim().replace(/^0x/, '').toLowerCase()
    if (/^[0-9a-f]{64}$/.test(normalized)) {
      return normalized
    }
    throw error
  }
}

/**
 * TON Connect derives a message's bounceability from the address form, so
 * re-encode the destination to match the Relay step's `bounce` flag
 * (`bounce: false` -> non-bounceable `UQ…`). When `bounce` is undefined the
 * address is left as-is; a malformed address with an explicit flag is a bad
 * step and fails loudly.
 */
const encodeAddress = (to: string, bounce?: boolean): string => {
  if (bounce === undefined) {
    return to
  }
  return Address.parse(to).toString({ bounceable: bounce, urlSafe: true })
}

/**
 * Origin success: the external message executed and the wallet emitted its
 * action. Deliberately lenient — only an explicit failure (aborted, or a phase
 * reporting `success: false`) is treated as failed, to avoid false negatives on
 * a deposit that actually landed (the SDK's route polling catches real route
 * failures separately).
 */
const isTransactionSuccessful = (description: unknown): boolean => {
  const desc = description as {
    type?: string
    aborted?: boolean
    computePhase?: { type?: string; success?: boolean }
    actionPhase?: { success?: boolean } | null
  }
  if (desc?.type !== 'generic') {
    return true
  }
  if (desc.aborted === true) {
    return false
  }
  const computeOk =
    desc.computePhase?.type === 'vm' ? desc.computePhase.success !== false : true
  const actionOk = desc.actionPhase ? desc.actionPhase.success !== false : true
  return computeOk && actionOk
}
