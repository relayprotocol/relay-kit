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
| `apiUrl` | `https://mainnet.zklighter.elliot.ai` | Lighter HTTP API URL |
| `apiKeyIndex` | `2` | API key slot to (re)register |
| `chainId` | `3586256` | Reported chain id |
| `wasmConfig` | jsDelivr CDN | `{ wasmPath, wasmExecPath }` |
| `storage` | — | Optional persistent API-key store |
| `pollIntervalMs` / `timeoutMs` | `2000` / `120000` | Confirmation polling |

By default the adapter regenerates the API key every page load — the key never leaves memory. Pass a `storage` implementation to reuse the key across sessions and skip the per-session `changeApiKey` signature prompt:

```ts
adaptLighterWallet({
  walletClient,
  storage: {
    get: (k) => localStorage.getItem(k),
    set: (k, v) => localStorage.setItem(k, v)
  }
})
```

#### Bundler note (Next.js / webpack)

`@reservoir0x/lighter-ts-sdk` imports `fs` at module load for its Node-only WASM branch. Browser bundlers need to stub it:

```js
// next.config.mjs
export default {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false }
    }
    return config
  }
}
```
