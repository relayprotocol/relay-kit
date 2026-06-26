---
'@relayprotocol/relay-sdk': patch
'@relayprotocol/relay-tron-wallet-adapter': patch
'@relayprotocol/relay-kit-ui': patch
---

Fix native TRX handling on Tron: forward call_value on the deposit transaction (was sending 0 TRX) and fix the native-TRX sentinel address (the wrong sentinel made native TRX fall through to a failing balanceOf call).
