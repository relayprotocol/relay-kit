---
'@relayprotocol/relay-kit-hooks': minor
'@relayprotocol/relay-kit-ui': minor
'@relayprotocol/relay-sdk': minor
---

Migrate the Requests API from v2 to v3 (breaking).

- `useRequests` / `queryRequests` and `useDepositAddressStatus` now call `GET /requests/v3` and return the v3 response shape.
- `GET /requests/v3` requires a Relay API key (`x-api-key`). Since these hooks run client-side, the key is not sent from Relay Kit — you must point `baseApiUrl` at a proxy that injects `x-api-key` server-side. This is now required to use the UI kit. See the package README.
- Response shape changes handled across the SDK/hooks/UI: `inTxs[].hash`/`outTxs[].hash` → `txHash`; `data.metadata.currencyIn/currencyOut/currencyGasTopup` removed — currencies for display are now derived from `data.route` (origin `inputCurrency` / destination `outputCurrency`, with `actual` → `quoted` and same-chain fallbacks); `failReason`/`refundFailReason` are `null` instead of `"N/A"`; new `submitted` status.
- `hash` request filter removed; lookups by transaction hash now use the unified `term` search.
- Breaking (SDK): the public types `CallFees` and `CallBreakdown` were renamed to `QuoteFees` and `SwapBreakdown` (re-exported from `@relayprotocol/relay-sdk`). Update any imports of the old names accordingly.
