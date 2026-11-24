---
'@relayprotocol/relay-kit-hooks': minor
---

`useExecutionStatus` and `queryExecutionStatus` now call `GET /intents/status/v3` instead of `/intents/status/v2`, which is retired on February 23, 2027. The response field `time` is renamed to `updatedAt`, so read `updatedAt` instead. `status` can now also be `submitted`, and failed requests include a `failReason`.
