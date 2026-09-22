---
'@relayprotocol/relay-kit-ui': patch
---

Fix the MoonPay checkout being cut off in the Onramp Widget. The embedded MoonPay iframe always fills its container and never reports its content height, so `overflowY: 'scroll'` on that container could never scroll — MoonPay's own layout is `overflow: hidden`, so anything past the 500px container was clipped. The widget now uses MoonPay's recommended 656px embedded height inside a scrollable wrapper that shrinks to fit the modal on short viewports.
