import {
  type AdaptedWallet,
  LogLevel,
  getClient
} from '@relayprotocol/relay-sdk'
import { TonClient } from '@ton/ton'
import { Address, Cell, beginCell, storeMessage } from '@ton/core'
import type {
  AdaptTonWalletOptions,
  TonConnectMessage,
  TonConnectTransactionRequest,
  TonSendTransaction
} from './types.js'

// TON Connect CHAIN identifier for mainnet (distinct from Relay's numeric
// chainIds). Relay only supports TON mainnet, so this is always mainnet. The
// field is an optional TON Connect guard — the wallet rejects the request if
// its selected network doesn't match.
const TON_MAINNET_CHAIN = '-239'

// How long a freshly built request should remain valid before the wallet
// rejects it, and how long / how often we poll for on-chain confirmation.
const DEFAULT_VALID_FOR_SECONDS = 300
const CONFIRM_POLL_MS = 2000
const CONFIRM_TIMEOUT_MS = 120_000
const CONFIRM_TX_LOOKBACK = 16

/**
 * Adapts a TON wallet for use with the Relay SDK.
 *
 * The user's private key lives in their wallet (e.g. Dynamic / TonConnect), so
 * this adapter never signs. It maps the Relay quote step into a TonConnect
 * transaction request, hands it to the wallet-provided `sendTransaction`
 * callback (which signs + broadcasts), and then polls a read-only TonClient for
 * confirmation.
 *
 * @param walletAddress - The connected wallet's address (raw or user-friendly).
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

  // Lazily resolve a read-only TonClient for confirmation. Prefers an explicit
  // endpoint, otherwise falls back to the RPC url Relay exposes for this chain.
  // No API key is required for either path.
  const getReadClient = (): TonClient => {
    if (_client) {
      return _client
    }
    const relayClient = getClient()
    const endpoint =
      options?.endpoint ??
      relayClient?.chains?.find((chain) => chain.id === _chainId)?.httpRpcUrl
    if (!endpoint) {
      throw new Error(
        'No TON RPC endpoint available for confirmation. Pass `endpoint` or `client` to adaptTonWallet, or ensure the Relay chain config includes an httpRpcUrl.'
      )
    }
    _client = new TonClient({ endpoint })
    return _client
  }

  const getChainId = async () => {
    return _chainId
  }

  return {
    vmType: 'tonvm',
    getChainId,
    address: async () => {
      return walletAddress
    },
    handleSignMessageStep: async () => {
      // TON message signing (TonConnect `signData`) isn't required for the
      // current deposit / bridge flows. Mirrors the Tron and Sui adapters.
      throw new Error('Message signing not implemented for TON')
    },
    handleSendTransactionStep: async (_chainId, stepItem) => {
      const client = getClient()

      const data = stepItem.data
      if (!data) {
        throw new Error('Transaction data not found')
      }

      // The Relay API returns a TonConnect-style transaction request for tonvm
      // steps. Normalize whatever shape arrives into a SendTransactionRequest.
      // TODO: confirm the exact `stepItem.data` shape once TON is live on the
      // Relay API and tighten this mapping accordingly.
      const request = buildTransactionRequest(data)

      client.log(['Sending TON transaction', request], LogLevel.Verbose)

      const result = await sendTransaction(request)
      const txHash = result?.transactionHash ?? result?.boc
      if (!txHash) {
        throw new Error('No transaction hash returned from TON wallet')
      }

      client.log(['TON transaction submitted', txHash], LogLevel.Verbose)

      return txHash
    },
    handleConfirmTransactionStep: async (txHash) => {
      const relayClient = getClient()
      const tonClient = getReadClient()
      const account = Address.parse(walletAddress)

      // The wallet returns either the signed external-message BOC or a hash of
      // it. Reduce it to a canonical hex hash so we can match it against the
      // wallet's on-chain transactions (TON's `Cell.hash()` is the source of
      // truth; matching is done in hex, the representation it serializes to).
      const targetHash = toMessageHashHex(txHash)

      const start = Date.now()
      while (true) {
        let confirmed: { hash: string; lt: string; description: unknown } | undefined
        try {
          const transactions = await tonClient.getTransactions(account, {
            limit: CONFIRM_TX_LOOKBACK
          })

          for (const tx of transactions) {
            const txHashHex = tx.hash().toString('hex')
            const inMessageHashHex = tx.inMessage
              ? beginCell()
                  .store(storeMessage(tx.inMessage))
                  .endCell()
                  .hash()
                  .toString('hex')
              : undefined

            if (txHashHex === targetHash || inMessageHashHex === targetHash) {
              confirmed = {
                hash: txHashHex,
                lt: tx.lt.toString(),
                description: tx.description
              }
              break
            }
          }
        } catch (error) {
          relayClient.log(
            ['Error polling for TON transaction', error],
            LogLevel.Verbose
          )
        }

        // Resolve success/failure outside the try so a failed transaction isn't
        // swallowed by the polling catch.
        if (confirmed) {
          if (!isTransactionSuccessful(confirmed.description)) {
            throw new Error('TON transaction failed')
          }
          return { hash: confirmed.hash, lt: confirmed.lt }
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
 * Normalizes a Relay step's transaction data into a TonConnect request.
 * Handles both an already-TonConnect-shaped payload (with a `messages` array)
 * and a single-message shape (`to`/`address` + `amount`/`value`).
 */
const buildTransactionRequest = (
  data: any
): TonConnectTransactionRequest => {
  const validUntil =
    typeof data.validUntil === 'number'
      ? data.validUntil
      : Math.floor(Date.now() / 1000) + DEFAULT_VALID_FOR_SECONDS

  let messages: TonConnectMessage[]
  if (Array.isArray(data.messages)) {
    messages = data.messages.map(normalizeMessage)
  } else {
    messages = [normalizeMessage(data)]
  }

  if (messages.length === 0) {
    throw new Error('TON transaction request contains no messages')
  }

  return {
    validUntil,
    network: typeof data.network === 'string' ? data.network : TON_MAINNET_CHAIN,
    from: typeof data.from === 'string' ? data.from : undefined,
    messages
  }
}

const normalizeMessage = (message: any): TonConnectMessage => {
  const address = message.address ?? message.to
  const rawAmount = message.amount ?? message.value
  if (!address || rawAmount === undefined || rawAmount === null) {
    throw new Error('TON message is missing an address or amount')
  }
  return {
    address: String(address),
    amount: String(rawAmount),
    payload: message.payload ?? message.data ?? undefined,
    stateInit: message.stateInit ?? undefined,
    extraCurrency: message.extraCurrency ?? undefined
  }
}

/**
 * Reduces a wallet-returned transaction identifier to a canonical lowercase hex
 * hash. The identifier is either an already-hex hash or the base64 BOC of the
 * signed external message, which we parse with @ton/core and hash. Hashing via
 * `Cell.hash()` keeps us aligned with how TON itself derives message hashes.
 * TODO: confirm the exact value `sendTransaction` returns once TON is live on
 * the Relay API, and tighten this accordingly.
 */
const toMessageHashHex = (identifier: string): string => {
  const hexCandidate = identifier.trim().replace(/^0x/, '')
  if (/^[0-9a-fA-F]+$/.test(hexCandidate) && hexCandidate.length % 2 === 0) {
    return hexCandidate.toLowerCase()
  }
  try {
    return Cell.fromBase64(identifier).hash().toString('hex')
  } catch {
    // Unknown encoding — return as-is so matching simply keeps polling rather
    // than throwing on an identifier we don't yet recognize.
    return identifier.trim()
  }
}

/**
 * Best-effort success check across the transaction's compute + action phases.
 * Uses a loose local shape because the exact phase fields should be validated
 * against live data before relying on them.
 * TODO: verify against live TON transactions once available on the API.
 */
const isTransactionSuccessful = (description: unknown): boolean => {
  const desc = description as {
    type?: string
    computePhase?: { type?: string; success?: boolean }
    actionPhase?: { success?: boolean } | null
  }
  if (desc?.type !== 'generic') {
    // Non-generic descriptions (e.g. storage-only) carry no execution result.
    return true
  }
  const computeOk =
    desc.computePhase?.type === 'vm' ? desc.computePhase.success !== false : true
  const actionOk = desc.actionPhase ? desc.actionPhase.success !== false : true
  return computeOk && actionOk
}
