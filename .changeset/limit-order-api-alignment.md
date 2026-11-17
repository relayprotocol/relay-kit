---
'@relayprotocol/relay-sdk': minor
---

Align the limit order types with the Orders API. `Order.cancelReason` is renamed to `Order.cancellationReason`; read the new name instead. `OrderOutcome` is now `filled`, `cancelled` or `expired`: an order whose funds were sent back closes as `cancelled` or `expired` and shows the amount in `refundedAmount`, so code that checked for `refunded`, `withdrawn` or `failed` should check `refundedAmount` instead. `Order.requiredAction` (`compliance_review` or `manual_refund`, typed as `OrderRequiredAction`) says what Relay has to do while an order is `requires_action`, and `OrderCreateErrorCode` adds `MAX_OPEN_ORDER_PAIRS_REACHED`. `signOrder` and `executeOrder` now treat a `409 ORDER_ALREADY_SIGNED`, returned when a signature the order was already opened with is posted again, as success and return the order as it is now.
