---
'@relayprotocol/relay-kit-ui': patch
---

Deposit-address quotes in `SwapWidget` and `OnrampWidget` now send `refundTo` set to the recipient when the recipient is valid on the origin chain. This fixes the "refundTo is required for deposit addresses that require a destination swap" error on routes that need a swap on the destination chain.
