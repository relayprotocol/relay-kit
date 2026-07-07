---
'@relayprotocol/relay-kit-ui': major
---

Migrate wallet balance fetching from Dune (sunset) to Codex

Breaking changes:

- `duneConfig` provider option removed — use `codexConfig` (`{ apiBaseUrl?, apiKey? }`). The default api base url is `https://graph.codex.io`; override it to proxy requests and protect your api key.
- `useDuneBalances` hook removed — use `useCodexBalances(address, queryOptions)`. The mainnet/testnet parameter is gone; balances are fetched from Codex-supported networks and filtered by your configured chains.
- `isDuneBalance` removed from `useCurrencyBalance`'s return value.
- `useMultiWalletBalances` no longer takes the mainnet/testnet parameter.

Other changes:

- New `useSolanaBalance` hook: selected SVM tokens (Solana and Eclipse) now fetch balances directly from the chain's RPC (native via `getBalance`, SPL via `getTokenAccountsByOwner`) instead of an indexer, so post-swap balances are fresh and the aggressive periodic refetch workaround is gone. The internal eclipse-only balance hook is gone; Eclipse flows through the same path.
- Native SVM balances (SOL, Eclipse ETH) in the consolidated token selector list are fetched from their RPCs and merged with Codex results, since Codex does not index native SVM balances (nor Eclipse at all). Their USD values come from Codex prices for wrapped SOL / mainnet WETH.
- Spam filtering: Codex's `removeScams` plus an `isScam` drop, and a liquidity heuristic replacing Dune's spam scoring — tokens whose pool liquidity is under $1k or below the balance's usd value have their usd value stripped so they can't crowd out real holdings in the token selector (balances still display).
- Known loss: Soon balances are gone from the token selector list; Soon is no longer a supported chain.
