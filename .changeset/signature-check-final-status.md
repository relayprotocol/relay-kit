---
'@relayprotocol/relay-sdk': patch
---

Stop signature steps from polling on after the status check reports `failure` or `refund`. A `failure` whose `details` did not contain "Transaction failed" was retried until the polling limit and then surfaced as a generic "Failed to get an ok response" timeout, and a `refund` was never treated as final. `execute` now rejects on the first such status, with the reported `details` for a failure and "Transaction failed: Refunded" (so `refunded` is set) for a refund, matching transaction steps.
