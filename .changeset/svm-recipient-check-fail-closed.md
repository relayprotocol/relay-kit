---
'@relayprotocol/relay-sdk': patch
'@relayprotocol/relay-kit-ui': patch
---

`CustomAddressModal` now warns when it cannot verify that a Solana or Eclipse recipient is a wallet (the destination RPC errors, times out, or is not configured), and requires the user to tick "I confirm this is a wallet address" before saving it. Confirmed token accounts are still blocked. `isSolanaTokenAccount` now throws on a malformed `getAccountInfo` response instead of returning `false`.
