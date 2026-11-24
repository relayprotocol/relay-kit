---
'@relayprotocol/relay-kit-ui': patch
---

Add a `refundTo` prop to `SwapWidget` and `OnrampWidget`. It is forwarded to `/quote/v3` as `refundTo`, so integrators can satisfy deposit-address routes that need a destination swap, which otherwise fail with "refundTo is required for deposit addresses that require a destination swap".
