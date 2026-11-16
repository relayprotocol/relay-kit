# @relayprotocol/relay-xrp-wallet-adapter

## 1.0.0

### Major Changes

- 138f30e: Add XRP support: new `@relayprotocol/relay-xrp-wallet-adapter` package exporting `adaptXrpWallet`, which sends native XRP deposits as XRPL Payments through a wallet-supplied `sendTransaction` callback and confirms them over JSON-RPC (configurable with `rpcUrl`). The SDK adds the `XrpReceipt` type and XRP fields on transaction step data, and the UI kit now accepts `xrpvm` in `supportedWalletVMs` and lists XRP as an origin chain when an XRP wallet is supported.

### Patch Changes

- Updated dependencies [7ff99e9]
- Updated dependencies [2e00e6b]
- Updated dependencies [2e00e6b]
- Updated dependencies [1d64f9a]
- Updated dependencies [be8501c]
- Updated dependencies [138f30e]
  - @relayprotocol/relay-sdk@8.1.0
