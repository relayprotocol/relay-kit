---
'@relayprotocol/relay-sdk': patch
'@relayprotocol/relay-kit-ui': patch
'@relayprotocol/relay-tron-wallet-adapter': patch
---

Fix Tron swap UX in the TRX/USDT flow. Tron balances now read from TronGrid's
fullnode endpoints (`wallet/getaccount`, `wallet/triggerconstantcontract`)
instead of the solidity node, so they reflect a completed swap without waiting
roughly a minute for solidification or needing a manual refresh.
`adaptTronWallet` confirms transactions with `getUnconfirmedTransactionInfo`,
which returns the receipt seconds after inclusion, so a successful approval no
longer hangs or reports a false "Transaction confirmation timed out".

Same-chain swaps that the solver has to fill — Tron TRX/USDT, deposit-address
routes, and forced solver execution — now show the cross-chain pending states
and wait for the fill to be confirmed before reporting success. Previously any
route whose origin and destination chain ids matched was assumed to settle with
the user's own transaction. The new `isSolverFilledStep` export identifies these
routes from the step the API returns.
