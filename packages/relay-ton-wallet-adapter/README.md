<h3 align="center">Relay TON Wallet Adapter</h3>

### Installation

```
yarn add @relayprotocol/relay-ton-wallet-adapter @relayprotocol/relay-sdk
```

Also make sure to install the peer dependencies required by the adapter if your application doesn't already include them:

```
yarn add viem @relayprotocol/relay-sdk @ton/core @ton/ton
```

### Usage

`adaptTonWallet` turns a connected TON wallet into an `AdaptedWallet` the Relay
SDK can execute against. The user's key lives in their wallet, so the adapter
never signs — you pass a `sendTransaction` callback that signs + broadcasts the
request via your wallet provider (e.g. Dynamic or TonConnect UI), and the
adapter handles request building and on-chain confirmation.

```ts
import { adaptTonWallet } from '@relayprotocol/relay-ton-wallet-adapter'
import { sendTransaction, isTonWalletAccount } from '@dynamic-labs-sdk/ton'

const adaptedWallet = adaptTonWallet(
  walletAddress,
  chainId, // the Relay numeric chainId for the TON network
  async (request) => {
    // request is a TonConnect-style { validUntil, messages, network? }
    return await sendTransaction({ walletAccount, request })
    // -> { transactionHash }
  }
)
```

#### Confirmation endpoint

`handleConfirmTransactionStep` polls a read-only [`@ton/ton`](https://github.com/ton-org/ton)
`TonClient`. By default the adapter creates one from the `httpRpcUrl` Relay
provides for the chain — no API key required. To use your own endpoint or an
existing client, pass them via the optional `options` argument:

```ts
import { TonClient } from '@ton/ton'

adaptTonWallet(walletAddress, chainId, sendTransaction, {
  client: new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' }),
  // or: endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  isTestnet: false
})
```

> Note: message signing (`handleSignMessageStep`) is not implemented, matching
> the Tron and Sui adapters. The exact shape of the Relay quote's `tonvm`
> transaction step is being finalized alongside backend TON support; the request
> mapping in `handleSendTransactionStep` may be tightened once it is live.
