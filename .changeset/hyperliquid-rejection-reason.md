---
'@relayprotocol/relay-sdk': patch
---

Report why Hyperliquid rejected a deposit: when `https://api.hyperliquid.xyz/exchange` rejects a signed action, `execute` now throws an `APIError` whose message includes Hyperliquid's reason, such as `Failed to send signature to HyperLiquid: Insufficient balance for withdrawal`, with the raw response on `rawError`. Previously it threw a bare string, so `error.message` and the step's `error` were `undefined`.
