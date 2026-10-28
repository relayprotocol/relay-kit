---
'@relayprotocol/relay-sdk': patch
---

Update API types to the latest Relay API: add the `atlasvm` chain VM type to `ChainVM`, add types for new endpoints (`/currencies/classifications`, `/withdrawals/balances`, `/access-tokens`, `/protocol/executions/{id}`, `/protocol/transfers`), and mark the canonical+ and fallback route quote options as deprecated, since the API now ignores them. Removes types for the `/conduit/install` endpoint.
