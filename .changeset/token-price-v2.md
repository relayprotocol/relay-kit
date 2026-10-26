---
'@relayprotocol/relay-kit-hooks': major
'@relayprotocol/relay-kit-ui': patch
---

`useTokenPrice` and `queryTokenPrice` now call `GET /currencies/token/price/v2`, and `data.price` is a decimal string instead of a number. Parse it with `Number()` where you do arithmetic and keep the string for display and storage; the Swap and Onramp widgets already do. `GET /currencies/token/price` is deprecated from October 30, 2026 and retires on January 28, 2027. See https://docs.relay.link/references/api/api_guides/migrating-to-token-price-v2.
