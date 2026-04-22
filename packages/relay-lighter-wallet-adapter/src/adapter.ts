import {
  AccountApi,
  ApiClient,
  SignerClient,
  TransactionApi
} from '@reservoir0x/lighter-ts-sdk'
import {
  getClient,
  LogLevel,
  type AdaptedWallet,
  type LvmReceipt
} from '@relayprotocol/relay-sdk'

export const LIGHTER_CHAIN_ID = 3586256

// The chain id baked into L2 signatures by the Lighter WASM signer. This is
// different from `LIGHTER_CHAIN_ID` — it's the value Lighter's zk circuit
// validates against on mainnet.
const LIGHTER_CIRCUIT_CHAIN_ID = 304

const DEFAULT_API_URL = 'https://mainnet.zklighter.elliot.ai'
const DEFAULT_API_KEY_INDEX = 2

// WASM assets hosted on jsDelivr.
// Override via `options.wasmConfig` if you'd rather self-host.
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

type LighterTx = Awaited<ReturnType<SignerClient['getTransaction']>>

const coerceLighterStatus = (
  status: LighterTx['status']
): (typeof LIGHTER_TX_STATUS)[keyof typeof LIGHTER_TX_STATUS] => {
  if (typeof status === 'number') {
    return status as (typeof LIGHTER_TX_STATUS)[keyof typeof LIGHTER_TX_STATUS]
  }
  switch (status) {
    case 'confirmed':
      return LIGHTER_TX_STATUS.EXECUTED
    case 'failed':
      return LIGHTER_TX_STATUS.FAILED
    case 'pending':
    default:
      return LIGHTER_TX_STATUS.PENDING
  }
}

/**
 * Polls Lighter's `/api/v1/tx` endpoint via the supplied SignerClient
 * until the transaction reaches the desired stage, a terminal failure,
 * or the timeout elapses.
 *
 *   - `waitFor: 'findable'` resolves as soon as the tx is indexed (any
 *     non-failed status). Used by `handleConfirmTransactionStep` — the
 *     Relay solver does its own end-to-end confirmation.
 *   - `waitFor: 'committed'` resolves only when status is COMMITTED or
 *     EXECUTED. Used in the session bootstrap after `changeApiKey`, so
 *     subsequent signed transfers don't race the key rotation.
 */
const pollLighterTransaction = async (
  signerClient: SignerClient,
  txHash: string,
  options: {
    pollIntervalMs: number
    timeoutMs: number
    waitFor: 'findable' | 'committed'
  }
): Promise<LighterTx> => {
  const { pollIntervalMs, timeoutMs, waitFor } = options
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / pollIntervalMs))

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let tx: LighterTx | undefined
    try {
      tx = await signerClient.getTransaction(txHash)
    } catch {
      // Transient fetch / indexing errors — retry below.
    }

    if (tx && tx.hash) {
      const numericStatus = coerceLighterStatus(tx.status)

      if (
        numericStatus === LIGHTER_TX_STATUS.FAILED ||
        numericStatus === LIGHTER_TX_STATUS.REJECTED
      ) {
        const label =
          numericStatus === LIGHTER_TX_STATUS.FAILED ? 'failed' : 'rejected'
        throw new Error(
          `Lighter transaction ${label}: ${tx.message ?? 'unknown error'}`
        )
      }

      if (waitFor === 'findable') {
        return tx
      }

      if (
        numericStatus === LIGHTER_TX_STATUS.COMMITTED ||
        numericStatus === LIGHTER_TX_STATUS.EXECUTED
      ) {
        return tx
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(
    `Lighter transaction ${txHash} did not reach '${waitFor}' within ${timeoutMs}ms`
  )
}

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
   *
   * Not invoked when `apiKey` is supplied (no bootstrap = no L1
   * signature needed, only the per-transfer authorization).
   */
  signL1Message: LighterSignL1Message
  //Lighter HTTP API base URL. Default: mainnet. Recommended to host a proxy.
  apiUrl?: string
  //API key slot to (re)register. Default: 2.
  apiKeyIndex?: number
  /** Paths to the Lighter WASM signer + Go runtime shim. Default: jsDelivr CDN. */
  wasmConfig?: {
    wasmPath?: string
    wasmExecPath?: string
  }
  /**
   * Pre-registered Lighter API key. When supplied, the adapter skips the
   * `generateAPIKey` + `changeApiKey` bootstrap entirely — no signature
   * prompt, no on-chain key-rotation wait — and uses this key directly
   * for the `SignerClient`.
   *
   * The caller is responsible for:
   *   - Having already registered the corresponding public key on the
   *     user's Lighter account at `apiKeyIndex`
   *   - Storing the private key securely
   *
   * Use this when you've built your own API-key lifecycle (e.g. a
   * backend service that provisions keys, or a wallet-level integration
   * that manages keys outside this adapter). Mutually exclusive with
   * `storage` — if both are set, `apiKey` wins and `storage` is ignored.
   */
  apiKey?: {
    /** Hex-encoded private key (with or without `0x` prefix). */
    privateKey: string
  }
  /**
   * Optional API-key persistence. When provided, the adapter reuses the
   * stored key across sessions instead of re-running `changeApiKey`.
   * Ignored when `apiKey` is supplied.
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
 */
export const adaptLighterWallet = (
  options: AdaptLighterWalletOptions
): AdaptedWallet => {
  const {
    l1Address,
    signL1Message,
    apiUrl = DEFAULT_API_URL,
    apiKeyIndex = DEFAULT_API_KEY_INDEX,
    wasmConfig,
    apiKey,
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
    // The SDK's `getAccount` is typed to return a single Account, but the
    // underlying `/api/v1/account` endpoint actually returns an envelope:
    //   { code, total, accounts: [{ index, l1_address, ... }] }
    // Coerce through `unknown` so we can safely read the real shape.
    const response = (await accountApi.getAccount({
      by: 'l1_address',
      value: normalizedL1Address
    })) as unknown as {
      code?: number
      total?: number
      accounts?: Array<{ index?: number | string }>
    }
    const firstAccount = response?.accounts?.[0]
    const rawIndex = firstAccount?.index
    const index = typeof rawIndex === 'number' ? rawIndex : Number(rawIndex)
    if (!firstAccount || !Number.isFinite(index)) {
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

      // Precedence: explicit `apiKey` > persisted via `storage` > fresh
      // bootstrap. The first two both bypass the `changeApiKey` prompt.
      const preRegisteredPrivateKey = apiKey?.privateKey
      const storageKey = `lighter-api-key:${normalizedL1Address}:${apiKeyIndex}`

      let hydratedPrivateKey: string | null = preRegisteredPrivateKey ?? null
      if (!hydratedPrivateKey && storage) {
        const stored = await storage.get(storageKey)
        hydratedPrivateKey = stored ?? null
      }

      if (hydratedPrivateKey) {
        const signerClient = new SignerClient({
          url: apiUrl,
          privateKey: hydratedPrivateKey,
          accountIndex,
          apiKeyIndex,
          chainId: LIGHTER_CIRCUIT_CHAIN_ID,
          wasmConfig: resolvedWasmConfig
        })
        await signerClient.initialize()
        await signerClient.ensureWasmClient()
        return { signerClient, accountIndex }
      }

      // No stored key — generate one and register it.
      //
      // Step 1: keygen-only client. A dummy private key is fine because
      // `generateAPIKey` is a stateless WASM call that doesn't use the
      // current signing context. We deliberately DO NOT call
      // `ensureWasmClient` here — doing so would lock the WASM's signing
      // context to the dummy key, and the ChangePubKey `Sig` (which proves
      // ownership of the new key) would be produced with the dummy key
      // instead of the freshly generated one, causing Lighter to reject
      // the tx as "invalid signature".
      const keygenClient = new SignerClient({
        url: apiUrl,
        privateKey: DUMMY_PRIVATE_KEY,
        accountIndex,
        apiKeyIndex,
        chainId: LIGHTER_CIRCUIT_CHAIN_ID,
        wasmConfig: resolvedWasmConfig
      })
      await keygenClient.initialize()
      const keypair = await keygenClient.generateAPIKey()
      if (!keypair) {
        throw new Error('Lighter adapter: failed to generate an API keypair')
      }

      // Step 2: the real client, backed by the newly generated key. Calling
      // `ensureWasmClient` now registers that key as the signing context
      // for the target slot, so `changeApiKey` produces a valid ownership
      // proof for the pubkey it's registering.
      const signerClient = new SignerClient({
        url: apiUrl,
        privateKey: keypair.privateKey,
        accountIndex,
        apiKeyIndex,
        chainId: LIGHTER_CIRCUIT_CHAIN_ID,
        wasmConfig: resolvedWasmConfig
      })
      await signerClient.initialize()
      await signerClient.ensureWasmClient()
      const nonceApiClient = new ApiClient({ host: apiUrl })
      const transactionApi = new TransactionApi(nonceApiClient)
      const nextNonceResponse = (await transactionApi.getNextNonce(
        accountIndex,
        apiKeyIndex
      )) as unknown as { nonce?: number | string }
      const rawNonce = nextNonceResponse?.nonce
      const nonceForChangeKey =
        typeof rawNonce === 'number' ? rawNonce : Number(rawNonce ?? 0)

      const [, changeKeyTxHash, changeKeyError] =
        await signerClient.changeApiKey({
          ethSigner: ethSignerShim as unknown as LighterEthSignerParam,
          newPubkey: keypair.publicKey,
          newApiKeyIndex: apiKeyIndex,
          nonce: Number.isFinite(nonceForChangeKey) ? nonceForChangeKey : 0
        })
      if (changeKeyError) {
        throw new Error(`Lighter changeApiKey failed: ${changeKeyError}`)
      }
      if (!changeKeyTxHash) {
        throw new Error('Lighter changeApiKey returned no transaction hash')
      }

      await pollLighterTransaction(signerClient, changeKeyTxHash, {
        pollIntervalMs,
        timeoutMs,
        waitFor: 'committed'
      })

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
    getChainId: async () => LIGHTER_CHAIN_ID,
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
        // usdcFee: params.usdcFee, Hardcoding for now
        usdcFee: 3000000,
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
    handleConfirmTransactionStep: async (
      txHash: string
    ): Promise<LvmReceipt> => {
      const { signerClient } = await ensureSession()
      const tx = await pollLighterTransaction(signerClient, txHash, {
        pollIntervalMs,
        timeoutMs,
        waitFor: 'findable'
      })
      return {
        txHash: tx.hash,
        blockHeight: tx.block_height ?? 0,
        status: tx.status
      }
    },
    switchChain: async () => {
      // Lighter is a single-chain network — nothing to switch
    }
  }
}
