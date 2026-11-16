---
'@relayprotocol/relay-sdk': patch
'@relayprotocol/relay-kit-ui': patch
---

The SVM token-account recipient check in `CustomAddressModal` and the swap widget now fails closed on Solana and Eclipse: when the destination RPC errors, times out, or is not configured, the custom recipient is rejected with a "Could not verify this address is a wallet" message instead of being accepted. `isSolanaTokenAccount` now throws on a malformed `getAccountInfo` response instead of returning `false`.
