<h3 align="center">Relay XRP Wallet Adapter</h3>

### Installation

```
yarn add @relayprotocol/relay-xrp-wallet-adapter @relayprotocol/relay-sdk
```

Also make sure to install the peer dependencies required by the adapter if your application doesn't already include them:

```
yarn add viem @relayprotocol/relay-sdk
```

### Usage

`adaptXrpWallet` turns a connected XRP Ledger wallet into an `AdaptedWallet` the
Relay SDK can execute against. The user's key lives in their wallet, so the
adapter never signs — you pass a `sendTransaction` callback that signs + submits
the transaction via your wallet provider, and the adapter handles building the
transaction and confirming it on-chain.

```ts
import { adaptXrpWallet } from '@relayprotocol/relay-xrp-wallet-adapter'

const adaptedWallet = adaptXrpWallet(walletAddress, async (transaction) => {
  // `transaction` is an unsigned XRPL Payment:
  // { TransactionType: 'Payment', Account, Destination, Amount, Memos }
  // Sign and submit it with your wallet provider, filling in Fee, Sequence and
  // LastLedgerSequence, then return the transaction hash.
  const hash = await signAndSubmit(transaction)
  return hash
})
```

Send the transaction exactly as given. `Memos` carries the Relay order id, and a
deposit without it cannot be matched to the order.

#### Confirmation endpoint

`handleConfirmTransactionStep` polls the XRPL JSON-RPC `tx` method until the
transaction is in a validated ledger, and fails on any result other than
`tesSUCCESS`. `getBalance` reads the account's XRP balance with `account_info`.
Both use the XRP chain's `httpRpcUrl` from the Relay client's chain
configuration by default; pass `rpcUrl` to use your own endpoint (e.g. a keyed
provider for production):

```ts
const adaptedWallet = adaptXrpWallet(walletAddress, sendTransaction, {
  rpcUrl: 'https://your-xrpl-rpc.example'
})
```

> Note: only native XRP is supported. Message signing (`handleSignMessageStep`)
> is not implemented, as it is not used by deposit/bridge flows.
