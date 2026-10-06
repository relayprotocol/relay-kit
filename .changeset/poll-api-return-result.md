---
'@relayprotocol/relay-sdk': patch
---

Fix `pollUntilHasData` and `pollUntilOk` resolving to `undefined` when the data or ok response arrives after the first attempt
