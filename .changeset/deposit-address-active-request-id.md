---
'@relayprotocol/relay-kit-hooks': minor
'@relayprotocol/relay-kit-ui': patch
---

Deposit-address flows now report the request id that owns the active lifecycle. `useDepositAddressStatus` returns a `requestId` alongside `status`, and the Swap Widget's deposit-address modal and the Onramp Widget use it for the transaction link and the `requestId` passed to render props. Previously these used the request id from the quote's deposit step, which is left permanently `pending` when the fill is regenerated against the same deposit address. Analytics `quote_id` and the MoonPay metadata post still reference the quote's request id.
