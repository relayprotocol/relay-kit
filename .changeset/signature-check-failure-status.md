---
'@relayprotocol/relay-sdk': patch
---

Set `checkStatus` to `failure` on a signature step item when the status check reports `failure`, as the refund branch and the transaction and websocket paths already do. Previously the item kept `pending` (or no status) after the step failed.
