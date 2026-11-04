---
'@relayprotocol/relay-sdk': patch
---

Return the successful result from `repeatUntilOk` after retries, so callers receive `true` regardless of which attempt succeeds instead of receiving `undefined` after the first attempt.
