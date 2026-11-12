---
'@relayprotocol/relay-sdk': patch
---

`getQuote` with `includeDefaultParameters` now keeps the `user` passed in when no wallet is given. It used to replace it with the origin chain's dead address, so the quote was requested for the burn address instead of that user. A wallet's address still takes precedence over `user`, as before.
