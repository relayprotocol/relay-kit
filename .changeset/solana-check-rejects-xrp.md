---
'@relayprotocol/relay-kit-ui': patch
---

`isSolanaAddress` no longer accepts XRP addresses. Both are base58, so an XRP address passed the Solana pattern; with an XRP wallet active, switching the origin to a Solana token kept the XRP wallet instead of switching to a linked Solana wallet, and the quote failed with an invalid address error.
