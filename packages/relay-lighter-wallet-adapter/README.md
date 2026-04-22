<h3 align="center">Relay Lighter Wallet Adapter</h3>

### Installation

```
yarn add @relayprotocol/relay-lighter-wallet-adapter @relayprotocol/relay-sdk
```

Peer dependencies:

```
yarn add viem @relayprotocol/relay-sdk
```

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
| `signL1Message` | — | `(message) => Promise<hex sig>` — typically `walletClient.signMessage({ account, message })` |
| `apiUrl` | `https://mainnet.zklighter.elliot.ai` | Lighter HTTP API base URL. Override to point at testnet, a proxy service, or your own staging deployment. All `/api/v1/*` traffic (account lookup, `sendTx`, status polling) uses this base. |
| `apiKeyIndex` | `2` | API key slot to (re)register |
| `chainId` | `3586256` | Reported chain id |
| `wasmConfig` | jsDelivr CDN | `{ wasmPath, wasmExecPath }` |
| `apiKey` | — | `{ privateKey }` — pre-registered key material (see below) |
| `storage` | — | Optional persistent API-key store |
| `pollIntervalMs` / `timeoutMs` | `2000` / `120000` | Confirmation polling |

#### API-key lifecycle strategies

The adapter supports three patterns, chosen automatically based on which options are set. Precedence: `apiKey` > `storage` > fresh bootstrap.

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

**3. Externally-managed key.** Integrators who run their own API-key lifecycle (backend provisioning, wallet-level integration, HSM, etc.) can skip the bootstrap entirely by supplying a pre-registered private key. The caller is responsible for having already registered the matching public key on the user's Lighter account at `apiKeyIndex`.

```ts
adaptLighterWallet({
  l1Address,
  signL1Message,
  apiKeyIndex: 2,
  apiKey: { privateKey: await fetchPrivateKeyFromMyKeyService(userId) }
})
```

No signature prompt fires for `changeApiKey`. The per-transfer L1 authorization (`signL1Message`) is still required.
