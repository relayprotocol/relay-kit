---
'@relayprotocol/relay-sdk': minor
---

The limit order types (`Order`, `CreateOrderBody`, `GetOrdersQuery`, `GetOrdersResponse` and the `Order*` enums) are now derived from the Relay API's OpenAPI spec, so they follow the API as it changes. `Order.closestPriceCheck` (`OrderPriceCheck`) is new: the check whose all-in price came closest to `targetPrice`, null until a check has an all-in price. `Order.fees` is now typed with `gas`, `relayer`, `relayerGas`, `relayerService`, `app` and `subsidized` instead of `Record<string, unknown>`, and `GetOrdersResponse` adds `status` and `txHashes`, returned when the query has an `orderId`. The API types also add the `/orders`, `/kyc/sessions`, `/kyc/status` and `/published-requests` endpoints and drop `/prices/rates`, which is no longer in the API spec.
