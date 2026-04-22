<h3 align="center">Relay Lighter Wallet Adapter</h3>

### Installation

```
yarn add @relayprotocol/relay-lighter-wallet-adapter @relayprotocol/relay-sdk viem
```

If you want the adapter to run its own bootstrap (fresh keygen, `accountApiKey`, or `storage` paths), you also need the Lighter SDK:

```
yarn add @reservoir0x/lighter-ts-sdk
```

It's declared as an **optional** peer dependency — integrators who always supply a pre-built `signerClient` can skip the install entirely. The adapter loads the SDK via a lazy dynamic `import()` and only touches it on the bootstrap path; if it's not installed and the bootstrap path runs, a clear error is thrown.

### Usage

```ts
import { adaptLighterWallet } from '@relayprotocol/relay-lighter-wallet-adapter'

const account = walletClient.account
const wallet = adaptLighterWallet({
  l1Address: account.address,
  signL1Message: (message) =>
    walletClient.signMessage({ account, message })
})
```

The adapter owns the full Lighter session lifecycle: it resolves the user's Lighter `accountIndex`, generates an in-memory API key, registers it on-chain via `changeApiKey`, and builds the `SignerClient` on demand. Construction is cheap — no network or signature prompts until the user actually initiates a transfer.

#### Options

| Option | Default | |
|---|---|---|
| `l1Address` | — | The user's connected EVM address |
| `signL1Message` | — | `(message) => Promise<hex sig>` — typically `walletClient.signMessage({ account, message })`. Optional when `signerClient` is supplied (the integrator owns signing). |
| `apiUrl` | `https://mainnet.zklighter.elliot.ai` | Lighter HTTP API base URL. Override to point at testnet, a proxy service, or your own staging deployment. All `/api/v1/*` traffic (account lookup, `sendTx`, status polling) uses this base. |
| `apiKeyIndex` | `2` | API key slot to (re)register |
| `chainId` | `3586256` | Reported chain id |
| `wasmConfig` | jsDelivr CDN | `{ wasmPath, wasmExecPath }` |
| `accountApiKey` | — | Hex-encoded pre-registered Lighter account API key (see below) |
| `signerClient` | — | A pre-built `LighterSigner` (see below) |
| `accountIndex` | — | Pre-known Lighter account index. Skips the HTTP account-lookup step (and the SDK import it requires). |
| `storage` | — | Optional persistent API-key store |
| `pollIntervalMs` / `timeoutMs` | `2000` / `120000` | Confirmation polling |

#### API-key lifecycle strategies

The adapter supports four patterns, chosen automatically based on which options are set. Precedence: `signerClient` > `accountApiKey` > `storage` > fresh bootstrap.

**1. Fresh bootstrap (default).** Regenerates an API key every page load — key never leaves memory. Integrator pays one signature prompt (`changeApiKey`) on the first transfer per session.

```ts
adaptLighterWallet({ l1Address, signL1Message })
```

**2. Persistent storage.** Reuses a previously-generated key across sessions. Only the first ever session pays the signature prompt.

```ts
adaptLighterWallet({
  l1Address,
  signL1Message,
  storage: {
    get: (k) => localStorage.getItem(k),
    set: (k, v) => localStorage.setItem(k, v)
  }
})
```

**3. Externally-managed key.** Integrators who run their own API-key lifecycle (backend provisioning, wallet-level integration, HSM, etc.) can skip the bootstrap entirely by supplying a pre-registered Lighter account API key. The caller is responsible for having already registered the matching public key on the user's Lighter account at `apiKeyIndex`.

```ts
adaptLighterWallet({
  l1Address,
  signL1Message,
  apiKeyIndex: 2,
  accountApiKey: await fetchAccountApiKeyFromMyKeyService(userId)
})
```

No signature prompt fires for `changeApiKey`. The per-transfer L1 authorization (`signL1Message`) is still required.

**4. Pre-built signer.** For integrators with privileged access to a Lighter-provided signer (already initialized, WASM loaded, key registered). Supplying `signerClient` bypasses every bootstrap step *and* avoids any runtime dependency on `@reservoir0x/lighter-ts-sdk` — the SDK is imported dynamically only when the adapter has to build its own signer, so this path tree-shakes the SDK out of the bundle.

The adapter only needs two methods, described by the `LighterSigner` type:

```ts
import type { LighterSigner } from '@relayprotocol/relay-lighter-wallet-adapter'

type LighterSigner = {
  transfer: (params: LighterTransferParams) => Promise<[unknown, string, string | null]>
  getTransaction: (txHash: string) => Promise<LighterTransaction>
}
```

A full `SignerClient` from `@reservoir0x/lighter-ts-sdk` satisfies this structurally and can be passed directly:

```ts
const client = await getLighterSigner() // from your Lighter integration

adaptLighterWallet({
  l1Address,
  signerClient: client,
  accountIndex // pair with `accountIndex` to run with zero dependency on @reservoir0x/lighter-ts-sdk
})
```

`signerClient` and `accountIndex` are fully independent — pairing them is what achieves the zero-SDK-runtime story. Supplying only `signerClient` skips the bootstrap but still loads the SDK dynamically to resolve the account index via HTTP.

When `signerClient` is set, `apiUrl`, `apiKeyIndex`, `wasmConfig`, `accountApiKey`, and `storage` are all ignored (the signer already has them baked in). `signL1Message` becomes optional too — if the integrator's signer handles L1 signing internally, omit it; otherwise supply it and the adapter will forward it to `transfer()` as `ethSigner`.
