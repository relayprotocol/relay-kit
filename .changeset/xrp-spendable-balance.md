---
'@relayprotocol/relay-xrp-wallet-adapter': patch
---

`getBalance` in `adaptXrpWallet` now returns the spendable XRP balance, excluding the account reserve (`reserve_base_xrp` plus `OwnerCount` × `reserve_inc_xrp`, read from `server_info`), floored at 0. Previously it returned the full `account_info` balance, so the swap widget overstated XRP balances by at least 1 XRP and MAX built Payments the ledger rejected.
