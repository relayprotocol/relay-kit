import {
  AccountApi,
  ApiClient,
  SignerClient
} from '@reservoir0x/lighter-ts-sdk'
import {
  getClient,
  LogLevel,
  type AdaptedWallet,
  type LvmReceipt
} from '@relayprotocol/relay-sdk'

export const LIGHTER_CHAIN_ID = 3586256

const DEFAULT_API_URL = 'https://mainnet.zklighter.elliot.ai'
const DEFAULT_API_KEY_INDEX = 2

// WASM assets hosted on jsDelivr. Browser bundlers don't serve
// `node_modules/@reservoir0x/lighter-ts-sdk/wasm/*` automatically, so we
// default to a public CDN. Override via `options.wasmConfig` if you'd
// rather self-host.
const LIGHTER_SDK_VERSION = '1.0.7-alpha16'
const DEFAULT_WASM_PATH = `https://cdn.jsdelivr.net/npm/@reservoir0x/lighter-ts-sdk@${LIGHTER_SDK_VERSION}/wasm/lighter-signer.wasm`
const DEFAULT_WASM_EXEC_PATH = `https://cdn.jsdelivr.net/npm/@reservoir0x/lighter-ts-sdk@${LIGHTER_SDK_VERSION}/wasm/wasm_exec.js`

// Dummy private key used only to bootstrap the throwaway SignerClient that
// performs the `generateAPIKey` / `changeApiKey` dance. `changeApiKey` uses
// the L1 signature as its root of trust, not `config.privateKey`.
const DUMMY_PRIVATE_KEY = '0x' + '00'.repeat(40)

// Lighter transaction status enum (mirrors @reservoir0x/lighter-ts-sdk TransactionStatus)
const LIGHTER_TX_STATUS = {
  PENDING: 0,
  QUEUED: 1,
  COMMITTED: 2,
  EXECUTED: 3,
  FAILED: 4,
  REJECTED: 5
} as const

type LighterEthSignerParam = Parameters<
  SignerClient['transfer']
>[0]['ethSigner']

/**
 * Optional per-origin persistent storage for the generated API key. If
 * omitted the adapter regenerates a fresh key on every page load (the
 * conservative default — key never leaves memory). If you want to skip the
 * per-session `changeApiKey` signature prompt, plug in something like
 * `localStorage` or IndexedDB.
 */
export type LighterKeyStorage = {
  get: (storageKey: string) => Promise<string | null> | string | null
  set: (storageKey: string, value: string) => Promise<void> | void
}

/** Callback that signs a plain-text L1 authorization message. */
export type LighterSignL1Message = (message: string) => Promise<string>

export type AdaptLighterWalletOptions = {
  /**
   * The user's L1 (EVM) wallet address. Used to resolve their Lighter
   * account index and to key the optional persistent storage.
   */
  l1Address: `0x${string}`
  /**
   * Callback that signs an L1 authorization message with the user's
   * connected wallet. Typically a thin wrapper around a viem
   * `WalletClient.signMessage` call.
   */
  signL1Message: LighterSignL1Message
  /** Lighter HTTP API base URL. Default: mainnet. */
  apiUrl?: string
  /** API key slot to (re)register. Default: 2. */
  apiKeyIndex?: number
  /** Override the reported chain id. Default: 3586256 (Lighter mainnet). */
  chainId?: number
  /** Paths to the Lighter WASM signer + Go runtime shim. Default: jsDelivr CDN. */
  wasmConfig?: {
    wasmPath?: string
    wasmExecPath?: string
  }
  /**
   * Optional API-key persistence. When provided, the adapter reuses the
   * stored key across sessions instead of re-running `changeApiKey`.
   */
  storage?: LighterKeyStorage
  /** Confirmation poll interval. Default: 2000ms. */
  pollIntervalMs?: number
  /** Confirmation timeout. Default: 120000ms. */
  timeoutMs?: number
}

type SessionState = {
  signerClient: SignerClient
  accountIndex: number
}

/**
 * Adapts a Lighter wallet to work with the Relay SDK.
 *
 * The adapter owns the full Lighter session lifecycle so integrators only
 * have to provide the user's L1 address and a message-signing callback:
 *
 *   ```ts
 *   const wallet = adaptLighterWallet({
 *     l1Address: account.address,
 *     signL1Message: (msg) =>
 *       walletClient.signMessage({ account, message: msg })
 *   })
 *   ```
 *
 * On construction the adapter does nothing interactive — no network calls,
 * no signature prompts. The first call into `handleSendTransactionStep`
 * triggers the lazy bootstrap, which:
 *   1. Resolves the user's Lighter `accountIndex` from their L1 address.
 *   2. Either loads a persisted API key (if `storage` is provided) or
 *      generates a fresh keypair in memory.
 *   3. For a fresh key, prompts the user to sign an L1 authorization and
 *      calls `changeApiKey` to register it against the account.
 *   4. Waits for the key rotation to execute on Lighter.
 *   5. Constructs the real `SignerClient` backed by the new key.
 *
 * Subsequent transactions reuse the cached session (in-memory at minimum).
 *
 * Bundler note: `@reservoir0x/lighter-ts-sdk` imports `fs` at module load
 * for its Node WASM branch. When bundling for the browser (Next.js,
 * webpack, etc.) add `resolve.fallback.fs = false` to your config — the
 * runtime code path doesn't touch `fs` in browsers.
 */
export const adaptLighterWallet = (
  options: AdaptLighterWalletOptions
): AdaptedWallet => {
  const {
    l1Address,
    signL1Message,
    apiUrl = DEFAULT_API_URL,
    apiKeyIndex = DEFAULT_API_KEY_INDEX,
    chainId = LIGHTER_CHAIN_ID,
    wasmConfig,
    storage,
    pollIntervalMs = 2_000,
    timeoutMs = 120_000
  } = options

  const normalizedL1Address = l1Address.toLowerCase()

  const resolvedWasmConfig = {
    wasmPath: wasmConfig?.wasmPath ?? DEFAULT_WASM_PATH,
    wasmExecPath: wasmConfig?.wasmExecPath ?? DEFAULT_WASM_EXEC_PATH
  }

  // The SDK's `SignerClient.transfer()` only calls `.signMessage(msg)` on
  // whatever is passed as `ethSigner`. We forward to the supplied callback.
  const ethSignerShim = {
    signMessage: (message: string): Promise<string> => signL1Message(message)
  }

  // Account-index cache. Resolved via public API — no signature required.
  let cachedAccountIndex: number | null = null
  const resolveAccountIndex = async (): Promise<number> => {
    if (cachedAccountIndex !== null) return cachedAccountIndex
    const apiClient = new ApiClient({ host: apiUrl })
    const accountApi = new AccountApi(apiClient)
    const lighterAccount = await accountApi.getAccount({
      by: 'l1_address',
      value: normalizedL1Address
    })
    const index = Number(lighterAccount.index)
    if (!Number.isFinite(index)) {
      throw new Error(
        `Lighter adapter: could not resolve accountIndex for ${l1Address}. ` +
          'Has the user created a Lighter account via an L1 deposit?'
      )
    }
    cachedAccountIndex = index
    return index
  }

  // Session bootstrap — runs once per L1 address per page (or cached via
  // storage if provided). Fires the `changeApiKey` signature prompt.
  let sessionPromise: Promise<SessionState> | null = null
  const ensureSession = (): Promise<SessionState> => {
    if (sessionPromise) return sessionPromise

    sessionPromise = (async () => {
      const accountIndex = await resolveAccountIndex()
      const storageKey = `lighter-api-key:${normalizedL1Address}:${apiKeyIndex}`

      // Re-hydrate a persisted API key if available
      let storedPrivateKey: string | null = null
      if (storage) {
        const stored = await storage.get(storageKey)
        storedPrivateKey = stored ?? null
      }

      if (storedPrivateKey) {
        const signerClient = new SignerClient({
          url: apiUrl,
          privateKey: storedPrivateKey,
          accountIndex,
          apiKeyIndex,
          chainId,
          wasmConfig: resolvedWasmConfig
        })
        await signerClient.initialize()
        return { signerClient, accountIndex }
      }

      // No stored key — run a throwaway SignerClient through
      // `generateAPIKey` + `changeApiKey`.
      const bootstrap = new SignerClient({
        url: apiUrl,
        privateKey: DUMMY_PRIVATE_KEY,
        accountIndex,
        apiKeyIndex,
        chainId,
        wasmConfig: resolvedWasmConfig
      })
      await bootstrap.initialize()

      const keypair = await bootstrap.generateAPIKey()
      if (!keypair) {
        throw new Error('Lighter adapter: failed to generate an API keypair')
      }

      const [, changeKeyTxHash, changeKeyError] = await bootstrap.changeApiKey({
        ethSigner: ethSignerShim as unknown as LighterEthSignerParam,
        newPubkey: keypair.publicKey,
        newApiKeyIndex: apiKeyIndex
      })
      if (changeKeyError) {
        throw new Error(`Lighter changeApiKey failed: ${changeKeyError}`)
      }
      if (!changeKeyTxHash) {
        throw new Error('Lighter changeApiKey returned no transaction hash')
      }

      await bootstrap.waitForTransaction(changeKeyTxHash)

      const signerClient = new SignerClient({
        url: apiUrl,
        privateKey: keypair.privateKey,
        accountIndex,
        apiKeyIndex,
        chainId,
        wasmConfig: resolvedWasmConfig
      })
      await signerClient.initialize()

      if (storage) {
        await storage.set(storageKey, keypair.privateKey)
      }

      return { signerClient, accountIndex }
    })()

    // If bootstrap fails, clear the promise so a retry can start fresh.
    sessionPromise.catch(() => {
      sessionPromise = null
    })

    return sessionPromise
  }

  return {
    vmType: 'lvm',
    getChainId: async () => chainId,
    address: async () => (await resolveAccountIndex()).toString(),
    handleSignMessageStep: async () => {
      throw new Error('Message signing not implemented for Lighter')
    },
    handleSendTransactionStep: async (_chainId, stepItem, _step) => {
      const client = getClient()
      const action = stepItem.data?.action

      if (!action || action.type !== 'transfer') {
        throw new Error(
          `Unsupported Lighter action: ${action?.type ?? 'undefined'}`
        )
      }

      const { signerClient } = await ensureSession()
      const params = action.parameters
      client.log(['Executing Lighter transfer', params], LogLevel.Verbose)

      const [, txHash, error] = await signerClient.transfer({
        toAccountIndex: params.toAccountIndex,
        assetIndex: params.assetIndex,
        fromRouteType: params.fromRouteType,
        toRouteType: params.toRouteType,
        amount: params.amount,
        usdcFee: params.usdcFee,
        memo: params.memo,
        ethSigner: ethSignerShim as unknown as LighterEthSignerParam
      })

      if (error) {
        throw new Error(`Lighter transfer failed: ${error}`)
      }
      if (!txHash) {
        throw new Error('Lighter transfer returned no transaction hash')
      }

      client.log(['Lighter transaction broadcasted', txHash], LogLevel.Verbose)

      return txHash
    },
    handleConfirmTransactionStep: async (txHash): Promise<LvmReceipt> => {
      const { signerClient } = await ensureSession()
      const start = Date.now()

      while (true) {
        let tx: Awaited<ReturnType<SignerClient['getTransaction']>> | undefined
        try {
          tx = await signerClient.getTransaction(txHash)
        } catch {
          // Transient fetch errors — fall through to polling
        }

        if (tx) {
          const numericStatus =
            typeof tx.status === 'number'
              ? tx.status
              : tx.status === 'confirmed'
                ? LIGHTER_TX_STATUS.EXECUTED
                : tx.status === 'failed'
                  ? LIGHTER_TX_STATUS.FAILED
                  : LIGHTER_TX_STATUS.PENDING

          if (
            numericStatus === LIGHTER_TX_STATUS.FAILED ||
            numericStatus === LIGHTER_TX_STATUS.REJECTED
          ) {
            const label =
              numericStatus === LIGHTER_TX_STATUS.FAILED
                ? 'failed'
                : 'rejected'
            throw new Error(
              `Lighter transaction ${label}: ${tx.message ?? 'unknown error'}`
            )
          }

          if (
            numericStatus === LIGHTER_TX_STATUS.COMMITTED ||
            numericStatus === LIGHTER_TX_STATUS.EXECUTED
          ) {
            return {
              txHash: tx.hash,
              blockHeight: tx.block_height,
              status: tx.status
            }
          }
        }

        if (Date.now() - start > timeoutMs) {
          throw new Error('Lighter transaction confirmation timed out')
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
      }
    },
    switchChain: async () => {
      // Lighter is a single-chain network — nothing to switch
    }
  }
}
