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

const adaptedWallet = adaptTonWallet(walletAddress, async (request) => {
  // `request` is a TonConnect-style { validUntil, messages, network? }.
  // Forward it to your wallet provider's send method (e.g. Dynamic's TON
  // connector, or `tonConnectUI.sendTransaction`) and return the result. The
  // adapter accepts { boc } (the signed external-message BOC most TonConnect
  // wallets return) or { transactionHash }.
  const boc = await wallet.sendTransaction(request)
  return { boc }
})
```

#### Confirmation endpoint

`handleConfirmTransactionStep` polls a read-only [`@ton/ton`](https://github.com/ton-org/ton)
`TonClient`. By default the adapter creates one against toncenter's public TON
HTTP API — no API key required. To use your own endpoint or an existing client,
pass them via the optional `options` argument:

```ts
import { TonClient } from '@ton/ton'

adaptTonWallet(walletAddress, sendTransaction, {
  client: new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' })
  // or: endpoint: 'https://toncenter.com/api/v2/jsonRPC'
})
```

> Note: message signing (`handleSignMessageStep`) is not implemented, as it is
> not used by deposit/bridge flows.
