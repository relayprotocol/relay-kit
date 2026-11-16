---
'@relayprotocol/relay-sdk': minor
---

`executeSteps` now also runs quote/v3-style flat steps, where `status`, `data` and `check` sit on the step instead of in `items`, alongside the legacy `items` steps. Flat steps are converted to the `items` shape before execution, so `onProgress` and the returned steps keep the shape they have today, and a flat step without a `requestId` takes the response's top-level `requestId`. The `FlatExecuteStep` type is exported.
