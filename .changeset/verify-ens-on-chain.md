---
'@relayprotocol/relay-kit-ui': patch
---

The recipient address modal now resolves ENS names on chain through the ENS Universal Resolver instead of the ensideas API, reading through your wagmi config's Ethereum mainnet transport (or the relay client's mainnet `httpRpcUrl` when wagmi has no mainnet). It shows the resolved address before you save, keeps Save disabled until the on-chain lookup returns, and rejects names that resolve to a dead address.
