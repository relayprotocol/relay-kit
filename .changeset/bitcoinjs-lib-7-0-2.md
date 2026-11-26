---
'@relayprotocol/relay-bitcoin-wallet-adapter': patch
---

`@relayprotocol/relay-bitcoin-wallet-adapter` now depends on `bitcoinjs-lib` 7.0.2, up from 7.0.1, which fixes CVE-2026-107846 (`Block.checkMerkleRoot` accepting duplicated Merkle tree nodes). The adapter only handles PSBTs and never calls the block validation APIs, so behavior is unchanged; the bump clears the advisory from dependency scans.
