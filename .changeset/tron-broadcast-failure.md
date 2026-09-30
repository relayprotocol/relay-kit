---
'@relayprotocol/relay-tron-wallet-adapter': patch
---

Fail Tron transaction steps as soon as the node rejects the broadcast. `sendRawTransaction` reports a rejected broadcast (for example `TRANSACTION_EXPIRATION_ERROR` when the wallet prompt stays open past the transaction's expiry) in its result instead of throwing, so `handleSendTransactionStep` returned the txid of a transaction that never reached the chain and execution only failed after the 90 second confirmation timeout. It now throws `Broadcast failed: <reason>` with the node's decoded message.
