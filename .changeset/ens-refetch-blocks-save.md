---
'@relayprotocol/relay-kit-ui': patch
---

The recipient address modal now keeps Save disabled while an ENS name is being looked up again, not only on the first lookup. Re-entering a name that was resolved earlier in the session no longer lets you save the cached address while the on-chain refetch is still running, so a name whose record changed commits the refreshed address.
