---
'@relayprotocol/relay-sdk': patch
---

Fix `execute()` accepting a checksummed burn address: `isDeadAddress` now matches the dead address regardless of EIP-55 checksum casing, so a checksummed dead address (`0x...dEaD`) is refused the same way the lowercase one is. The SDK itself uses the dead address as a default recipient when no wallet is connected, so the guard is the only thing between that placeholder and burned funds.
