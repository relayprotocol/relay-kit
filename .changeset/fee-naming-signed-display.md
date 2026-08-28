---
'@relayprotocol/relay-kit-ui': patch
---

Align swap widget fee display with the Dashboard and transaction page:
"Swap Impact" is now "Swap Cost", "Relay Fee" is "Platform Fee" (with a green
"(Reward)" note when Relay pays the user), "Execution Fee" is "Execution
Cost", and "Network cost" is "Deposit gas". Credits render green with a
leading "+", zero fees display as "$0.00" instead of "-", and sub-cent
values as signed "+< $0.01" / "-< $0.01".
