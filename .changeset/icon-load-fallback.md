---
'@relayprotocol/relay-kit-ui': patch
---

Gracefully handle broken token/chain logo images. ChainTokenIcon now falls back to the token symbol avatar and ChainIcon hides itself when the logo fails to load, instead of rendering a broken-image placeholder.
