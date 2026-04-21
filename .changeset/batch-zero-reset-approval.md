---
'@relayprotocol/relay-sdk': patch
---

Support atomic batching for zero-reset approval swap flows (e.g. USDT on Ethereum). `canBatchTransactions` and `prepareBatchTransaction` now accept any number of leading `approve` steps before the terminal `swap`/`deposit`, so wallets that support EIP-5792 collapse the `approve(0) → approve(amount) → swap` sequence into a single `wallet_sendCalls` instead of three separate prompts.
