---
'@relayprotocol/relay-kit-ui': patch
---

Increase the embedded MoonPay widget height in the Onramp Widget from 500px to 540px so MoonPay's current checkout content is not cut off. The widget keeps `overflowY: scroll`, so taller MoonPay content stays reachable.
