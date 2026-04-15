---
'@relayprotocol/relay-kit-ui': patch
---

Use spotClearinghouseState for Spot USDC and unified Hyperliquid accounts. Adds a new useHyperliquidAccountMode hook to detect the user's account abstraction mode, and routes balance queries through spotClearinghouseState for unified/portfolio-margin accounts where the Perps USDC balance is reported under spot.
