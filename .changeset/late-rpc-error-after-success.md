---
'@relayprotocol/relay-sdk': patch
'@relayprotocol/relay-kit-ui': patch
---

Fix swap showing an error after already succeeding. When the websocket confirmed a request as successful, step execution stayed blocked on the RPC receipt lookup; if that RPC call then failed, executeSteps rejected with a TransactionConfirmationError and the swap widget flipped from Success to Error. Websocket success now resolves the step directly, late receipt errors are ignored once the backend has confirmed success, and the transaction modal no longer downgrades a Success state to Error.
