---
'@relayprotocol/relay-svm-wallet-adapter': major
---

`adaptSolanaWallet` is now bound to the SVM chain it was created for. `switchChain`,
`handleSendTransactionStep` and `handleConfirmTransactionStep` reject any other chain id
instead of reporting the new chain while still using the original `Connection`, so a swap
can no longer be signed against Solana after switching to Eclipse (or the reverse). To
support several SVM chains, create one adapter per chain, each with a `Connection` for that
chain, and pass the one matching the origin chain.
