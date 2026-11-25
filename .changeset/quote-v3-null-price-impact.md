---
'@relayprotocol/relay-sdk': patch
'@relayprotocol/relay-kit-ui': patch
---

`/quote/v3` now returns `details.totalImpact` and `details.swapImpact` as `null` when the input or output token has no USD price, and the SDK's quote types now allow `null` for both. The swap widget no longer shows an empty `()` next to the output amount for these quotes, and the Price Impact row and its tooltip show "Unavailable" instead of a blank value.
