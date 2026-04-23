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

// Dummy key used only to bootstrap the throwaway SignerClient that performs
// the `generateAPIKey` / `changeApiKey` dance. `changeApiKey` uses the L1
// signature as its root of trust, not this value.
const DUMMY_API_KEY = '0x' + '00'.repeat(40)

const LIGHTER_TX_STATUS = {
  PENDING: 0,
  QUEUED: 1,
  COMMITTED: 2,
  EXECUTED: 3,
  FAILED: 4,
  REJECTED: 5
} as const

/**
 * Minimal L1 signer shape the adapter passes into `transfer()`. The real
 * Lighter SDK accepts `string | ethers.Signer`; we only ever use
 * `signMessage`, so that's all we require structurally.
 */
export type LighterEthSigner = {
  signMessage: (message: string) => Promise<string>
}

export type LighterTransferParams = {
  toAccountIndex: number
  assetIndex: number
  fromRouteType: number
  toRouteType: number
  amount: number
  usdcFee: number
  memo: string
  /**
   * L1 signer used for the per-transfer authorization. Only omitted when
   * the caller's `signerClient` handles L1 signing internally — the stock
   * `@reservoir0x/lighter-ts-sdk` `SignerClient` requires it.
   */
  ethSigner?: LighterEthSigner
  nonce?: number
}

/** Subset of the SDK's `Transaction` shape that the adapter actually reads. */
export type LighterTransaction = {
  hash: string
  status: number | 'pending' | 'confirmed' | 'failed'
  block_height?: number
  message?: string
}

/**
 * Minimal Lighter signer contract the adapter depends on. Integrators
 * passing a pre-built signer only need to implement these two methods;
 * the full `@reservoir0x/lighter-ts-sdk` `SignerClient` satisfies this
 * structurally and can be passed directly.
 */
export type LighterSigner = {
  transfer: (
    params: LighterTransferParams
  ) => Promise<[unknown, string, string | null]>
  getTransaction: (txHash: string) => Promise<LighterTransaction>
}

// Lazy, cached dynamic import of `@reservoir0x/lighter-ts-sdk`. Only fires
// when the adapter needs to bootstrap its own SignerClient. Integrators who
// always supply a pre-built `signerClient` don't need the package installed
// at all — it's declared as an optional peer dependency.
let sdkModulePromise: Promise<
  typeof import('@reservoir0x/lighter-ts-sdk')
> | null = null
const loadLighterSdk = (): Promise<
  typeof import('@reservoir0x/lighter-ts-sdk')
> => {
  if (!sdkModulePromise) {
    sdkModulePromise = import('@reservoir0x/lighter-ts-sdk').catch((cause) => {
      // Reset so the next attempt re-tries the import — callers who install
      // the peer mid-session shouldn't have to reload.
      sdkModulePromise = null
      throw new Error(
        'Lighter adapter: `@reservoir0x/lighter-ts-sdk` is required for the ' +
          'bootstrap path (fresh keygen, `accountApiKey`, or `storage`). ' +
          'Install it as a peer dependency, or pass a pre-built `signerClient` ' +
          'to skip the SDK entirely.',
        { cause }
      )
    })
  }
  return sdkModulePromise
}

const coerceLighterStatus = (
  status: LighterTransaction['status']
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

const pollLighterTransaction = async (
  signerClient: Pick<LighterSigner, 'getTransaction'>,
  txHash: string,
  options: {
    pollIntervalMs: number
    timeoutMs: number
    waitFor: 'findable' | 'committed'
  }
): Promise<LighterTransaction> => {
  const { pollIntervalMs, timeoutMs, waitFor } = options
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / pollIntervalMs))

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let tx: LighterTransaction | undefined
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

type AdaptLighterWalletBaseOptions = {
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
   * Required unless `signerClient` is supplied — when the integrator
   * provides their own signer, it's assumed to handle L1 signing
   * internally (or to accept `signL1Message` as a separate concern).
   *
   * When both are supplied, `signL1Message` is still forwarded to the
   * signer's `transfer()` calls via the `ethSigner` param.
   *
   * Not invoked for the bootstrap step when `accountApiKey` or
   * `signerClient` is supplied — only for per-transfer authorization.
   */
  signL1Message?: LighterSignL1Message
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
   * Pre-registered Lighter account API key (hex-encoded, with or without
   * `0x` prefix). This is the Lighter protocol's session key — not a
   * wallet private key. When supplied, the adapter skips the
   * `generateAPIKey` + `changeApiKey` bootstrap entirely (no signature
   * prompt, no on-chain key-rotation wait) and uses this key directly for
   * the `SignerClient`.
   *
   * The caller is responsible for:
   *   - Having already registered the corresponding public key on the
   *     user's Lighter account at `apiKeyIndex`
   *   - Storing the key securely
   *
   * Use this when you've built your own API-key lifecycle (e.g. a
   * backend service that provisions keys, or a wallet-level integration
   * that manages keys outside this adapter). Mutually exclusive with
   * `storage` — if both are set, `accountApiKey` wins and `storage` is
   * ignored.
   */
  accountApiKey?: string
  /**
   * Optional API-key persistence. When provided, the adapter reuses the
   * stored key across sessions instead of re-running `changeApiKey`.
   * Ignored when `accountApiKey` or `signerClient` is supplied.
   */
  storage?: LighterKeyStorage
  /** Confirmation poll interval. Default: 2000ms. */
  pollIntervalMs?: number
  /** Confirmation timeout. Default: 120000ms. */
  timeoutMs?: number
}

/**
 * Pre-built-signer path. `signerClient` and `accountIndex` must be paired
 * — the adapter can't pull account index out of a `SignerClient` instance
 * (the SDK's config is private), and it needs the value for
 * `AdaptedWallet.address()`. Pairing them lets the adapter run with
 * zero runtime dependency on `@reservoir0x/lighter-ts-sdk`.
 */
type AdaptLighterWalletPreBuiltOptions = AdaptLighterWalletBaseOptions & {
  /**
   * Pre-built Lighter signer. When supplied, the adapter bypasses the
   * `generateAPIKey` / `changeApiKey` bootstrap entirely and uses this
   * signer for all `transfer()` and `getTransaction()` calls.
   *
   * The caller is responsible for ensuring the signer is ready to use
   * (initialized, WASM loaded, API key registered) and for caching it
   * if desired. A full `SignerClient` from `@reservoir0x/lighter-ts-sdk`
   * satisfies `LighterSigner` structurally and can be passed directly.
   *
   * When set, `apiUrl`, `apiKeyIndex`, `wasmConfig`, `accountApiKey`,
   * and `storage` are all ignored (baked into the signer).
   */
  signerClient: LighterSigner
  /** The user's Lighter account index. Required when `signerClient` is set. */
  accountIndex: number
}

/** Bootstrap path — the adapter owns the signer lifecycle. */
type AdaptLighterWalletBootstrapOptions = AdaptLighterWalletBaseOptions & {
  signerClient?: never
  accountIndex?: never
}

export type AdaptLighterWalletOptions =
  | AdaptLighterWalletBootstrapOptions
  | AdaptLighterWalletPreBuiltOptions

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
 * Passing `signerClient` skips the entire bootstrap and avoids any runtime
 * dependency on `@reservoir0x/lighter-ts-sdk`.
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
    accountApiKey,
    signerClient: preConfiguredSigner,
    accountIndex: preConfiguredAccountIndex,
    storage,
    pollIntervalMs = 2_000,
    timeoutMs = 120_000
  } = options

  // `signL1Message` is only optional when the caller supplies a
  // `signerClient`; otherwise the adapter's own bootstrap + `transfer()`
  // path calls the stock `SignerClient`, which requires an ethSigner.
  if (!preConfiguredSigner && !signL1Message) {
    throw new Error(
      'Lighter adapter: `signL1Message` is required unless a pre-built `signerClient` is supplied.'
    )
  }

  const normalizedL1Address = l1Address.toLowerCase()

  const resolvedWasmConfig = {
    wasmPath: wasmConfig?.wasmPath ?? DEFAULT_WASM_PATH,
    wasmExecPath: wasmConfig?.wasmExecPath ?? DEFAULT_WASM_EXEC_PATH
  }

  // The SDK's `SignerClient.transfer()` only calls `.signMessage(msg)` on
  // whatever is passed as `ethSigner`. We forward to the supplied callback.
  // `undefined` when the caller's `signerClient` handles L1 signing on its
  // own — forwarded as-is to their `transfer()` implementation.
  const ethSignerShim: LighterEthSigner | undefined = signL1Message
    ? {
        signMessage: (message: string): Promise<string> =>
          signL1Message(message)
      }
    : undefined

  // Account-index cache. Resolved via public API — no signature required.
  // Pre-populated from the `accountIndex` option when supplied, so we
  // never hit the network (or the SDK) in that path.
  let cachedAccountIndex: number | null = preConfiguredAccountIndex ?? null
  const resolveAccountIndex = async (): Promise<number> => {
    if (cachedAccountIndex !== null) return cachedAccountIndex
    const { AccountApi, ApiClient } = await loadLighterSdk()
    const apiClient = new ApiClient({ host: apiUrl })
    const accountApi = new AccountApi(apiClient)
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

  // Signer resolution. When `signerClient` is supplied, this is a direct
  // pass-through — no network, no SDK import, no account-index lookup.
  // Otherwise the first call triggers the lazy bootstrap, which fires the
  // `changeApiKey` signature prompt if we have to generate a fresh key.
  let signerPromise: Promise<LighterSigner> | null = preConfiguredSigner
    ? Promise.resolve(preConfiguredSigner)
    : null
  const getSigner = (): Promise<LighterSigner> => {
    if (signerPromise) return signerPromise

    signerPromise = (async () => {
      const { SignerClient, ApiClient, TransactionApi } = await loadLighterSdk()
      const accountIndex = await resolveAccountIndex()

      // Precedence: explicit `accountApiKey` > persisted via `storage` >
      // fresh bootstrap. The first two both bypass the `changeApiKey` prompt.
      const storageKey = `lighter-api-key:${normalizedL1Address}:${apiKeyIndex}`

      let hydratedAccountApiKey: string | null = accountApiKey ?? null
      if (!hydratedAccountApiKey && storage) {
        const stored = await storage.get(storageKey)
        hydratedAccountApiKey = stored ?? null
      }

      if (hydratedAccountApiKey) {
        const signerClient = new SignerClient({
          url: apiUrl,
          privateKey: hydratedAccountApiKey,
          accountIndex,
          apiKeyIndex,
          chainId: LIGHTER_CIRCUIT_CHAIN_ID,
          wasmConfig: resolvedWasmConfig
        })
        await signerClient.initialize()
        await signerClient.ensureWasmClient()
        // Cast: SignerClient's `transfer` accepts `string | Signer` for
        // `ethSigner`, which is structurally wider than our
        // `LighterEthSigner`. Safe because the SDK only calls
        // `.signMessage()` on it.
        return signerClient as unknown as LighterSigner
      }

      // No stored key — generate one and register it.
      //
      // Step 1: keygen-only client. A dummy key is fine because
      // `generateAPIKey` is a stateless WASM call that doesn't use the
      // current signing context. We deliberately DO NOT call
      // `ensureWasmClient` here — doing so would lock the WASM's signing
      // context to the dummy key, and the ChangePubKey `Sig` (which proves
      // ownership of the new key) would be produced with the dummy key
      // instead of the freshly generated one, causing Lighter to reject
      // the tx as "invalid signature".
      const keygenClient = new SignerClient({
        url: apiUrl,
        privateKey: DUMMY_API_KEY,
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
          // Cast through `unknown`: the SDK types `ethSigner` as
          // `string | ethers.Signer`, but it only ever invokes
          // `.signMessage()` on it — which our shim provides.
          ethSigner: ethSignerShim as unknown as Parameters<
            typeof signerClient.changeApiKey
          >[0]['ethSigner'],
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

      // Same narrowing cast as the hydrated-key branch above.
      return signerClient as unknown as LighterSigner
    })()

    // If bootstrap fails, clear the promise so a retry can start fresh.
    signerPromise.catch(() => {
      signerPromise = null
    })

    return signerPromise
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

      const signerClient = await getSigner()
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
        ethSigner: ethSignerShim
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
      const signerClient = await getSigner()
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
