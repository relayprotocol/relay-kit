---
'@relayprotocol/relay-xrp-wallet-adapter': major
'@relayprotocol/relay-sdk': minor
'@relayprotocol/relay-kit-ui': minor
---

Add XRP support: new `@relayprotocol/relay-xrp-wallet-adapter` package exporting `adaptXrpWallet`, which sends native XRP deposits as XRPL Payments through a wallet-supplied `sendTransaction` callback and confirms them over JSON-RPC (configurable with `rpcUrl`). The SDK adds the `XrpReceipt` type and XRP fields on transaction step data, and the UI kit now accepts `xrpvm` in `supportedWalletVMs` and lists XRP as an origin chain when an XRP wallet is supported.
