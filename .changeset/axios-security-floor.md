---
'@relayprotocol/relay-sdk': patch
'@relayprotocol/relay-kit-hooks': patch
'@relayprotocol/relay-kit-ui': patch
'@relayprotocol/relay-bitcoin-wallet-adapter': patch
'@relayprotocol/relay-ethers-wallet-adapter': patch
'@relayprotocol/relay-svm-wallet-adapter': patch
'@relayprotocol/relay-tron-wallet-adapter': patch
---

Require axios `^1.20.0` in `@relayprotocol/relay-sdk`, `@relayprotocol/relay-kit-hooks` and
`@relayprotocol/relay-kit-ui`, so installs no longer resolve axios versions with published high
severity advisories. The bitcoin, ethers, SVM and Tron wallet adapters no longer declare their
own axios dependency; the ethers adapter's `axios@^0.27.2` is gone from installs.
