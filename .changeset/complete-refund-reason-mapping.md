---
'@relayprotocol/relay-kit-ui': patch
---

Complete the RefundReason error mapping. Every failReason code in the API schema now resolves to a specific user-facing explanation instead of falling back to the generic unknown-issue message, matching the copy used on relay.link and the developer dashboard.
