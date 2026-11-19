---
'@relayprotocol/relay-kit-ui': patch
---

`SwapWidget`, `OnrampWidget` and the deposit-address flow no longer throw viem's `InvalidDecimalNumberError` while the amount input is empty. viem 2.55.4 and later throw from `parseUnits('')` where earlier versions returned `0n`, so the widget unmounted on first render and again after every completed swap for apps on a current viem. An empty or partially typed amount is now treated as `0` when building quote parameters (the quote hooks were already disabled for a zero amount), so viem can be upgraded past 2.55.3 without pinning.
