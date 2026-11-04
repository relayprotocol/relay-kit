---
'@relayprotocol/relay-kit-ui': patch
---

Fix the token amount shown under the Swap Widget's USD input. In USD input mode the token equivalent dropped trailing zeros from whole numbers, so $100 of USDC showed as `1 USDC` and an amount of 1,000 showed as `1,`. `formatNumber` now only trims zeros after the decimal point.
