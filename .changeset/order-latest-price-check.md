---
'@relayprotocol/relay-sdk': minor
---

Rename `Order.latestCheck` to `Order.latestPriceCheck` to match the field the Orders API returns; read `latestPriceCheck` instead, since `latestCheck` is never set. Its shape (`OrderPriceCheck`: `marketPrice`, `allInPrice`, `reason`, `checkedAt`) is unchanged. `reason` names the first thing that stopped a fill, checked in this order: `insufficient_balance`, `insufficient_allowance`, `no_route`, then `price_not_reached`; it is null when nothing did.
