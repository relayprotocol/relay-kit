---
'@relayprotocol/relay-sdk': patch
---

Signature post and status check endpoints from API responses must stay on the configured `baseApiUrl` origin; executions with an endpoint that resolves to another host now fail. `isRelayApiUrl` compares origins instead of string prefixes, so the API key is only sent to the Relay API.
