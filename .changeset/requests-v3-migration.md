---
'@relayprotocol/relay-kit-hooks': major
'@relayprotocol/relay-kit-ui': major
'@relayprotocol/relay-sdk': major
---

Migrate the Requests API from v2 to v3 (breaking).

- `useRequests` / `queryRequests` and `useDepositAddressStatus` now call `GET /requests/v3` and return the v3 response shape.
- `GET /requests/v3` requires a Relay API key (`x-api-key`). Since these hooks run client-side, the key is not sent from Relay Kit — you must point `baseApiUrl` at a proxy that injects `x-api-key` server-side. This is now required to use the UI kit. See the package README.
- Response shape changes handled across the SDK/hooks/UI: `inTxs[].hash`/`outTxs[].hash` → `txHash`; `data.metadata.currencyIn/currencyOut/currencyGasTopup` removed — currencies for display are now derived from `data.route` (origin `inputCurrency` / destination `outputCurrency`, with `actual` → `quoted` and same-chain fallbacks); `failReason`/`refundFailReason` are `null` instead of `"N/A"`; new `submitted` status.
- `hash` request filter removed; lookups by transaction hash now use the unified `term` search.
- `RelayKitProvider` now warns (client-side) when `baseApiUrl` points directly at the Relay API instead of a proxy: a `console.error` if an `apiKey` is also set (it would be exposed in the browser), otherwise a `console.warn` that `/requests/v3` will fail without a proxy. Suppress with `acknowledgeApiKeyExposure: true`.
- **Removed** the `secureBaseUrl` option from `RelayKitProvider` and the `useSecureBaseUrl` prop from `SwapWidget`. All Relay API traffic now flows through the single `baseApiUrl`, which must be a proxy — the proxy is responsible for any gas-sponsorship logic (and injecting `x-api-key`) server-side.
