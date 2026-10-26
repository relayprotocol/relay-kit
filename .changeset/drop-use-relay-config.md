---
'@relayprotocol/relay-kit-hooks': major
---

`useRelayConfig` and `queryRelayConfig` are removed. They called `GET /config/v2`, which retires with no successor on January 28, 2027. Stop calling the endpoint and drop any code that read its response.
