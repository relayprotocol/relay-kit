---
'@relayprotocol/relay-sdk': patch
---

Fix `isDeadAddress` to match the EIP-55 checksummed dead address (`0x0000…dEaD`), not only the lowercase constant. The `execute()` burn-address guard compares the recipient and sender against the dead address, but checksummed input never equalled the lowercase constant, so funds could be sent to the burn address. `0x`-prefixed input is now lowercased before comparing; base58/bech32 dead addresses stay exact-match because their alphabets are case-sensitive. Adds `packages/sdk/src/constants/address.test.ts` covering the checksummed and lowercase dead addresses, every dead-address constant, the case-sensitivity of the non-hex addresses, and `getDeadAddress` for every VM type.
