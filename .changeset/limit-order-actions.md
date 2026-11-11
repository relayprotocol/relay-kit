---
'@relayprotocol/relay-sdk': minor
---

Add limit order actions for the Orders API: `createOrder` (`POST /orders`, with an optional `idempotencyKey` sent as `Idempotency-Key`), `getOrders` (`GET /orders`), `signOrder` (`POST /orders/:orderId/signature`), `cancelOrder` (`POST /orders/:orderId/cancel`, soft by default, `onchain` for the Permit2 nonce invalidation) and `executeOrder`. Given a `wallet`, `createOrder` and `cancelOrder` also run the order's steps (Permit2 approval, order signature, on-chain cancel) and report progress through `onProgress`; `executeOrder` resumes the steps of an order read with `getOrders`. Types such as `Order`, `OrderStatus` and `CreateOrderBody` are exported.
