---
'@relayprotocol/relay-kit-ui': patch
---

Stop firing an unfiltered `GET /requests` when the swap success modal is closed. The
transaction lookup in `TransactionModal` is only ever filtered by `id`, but it stayed
enabled on the tx hashes alone — so clearing `steps` on close dropped the `requestId`
while the query was still enabled, sending a request with no filters. It is now enabled
only when a `requestId` is present.
