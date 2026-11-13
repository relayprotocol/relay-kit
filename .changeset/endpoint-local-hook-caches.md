---
'@relayprotocol/relay-kit-hooks': patch
---

Keep cached results separate for each API endpoint in `useRequests`, `useTokenList`, `useTokenPrice`, `useTrendingCurrencies`, `useQuote`, `useExecutionStatus`, and `useDepositAddressStatus`. Switching `baseApiUrl` now loads the new endpoint's data instead of reusing the previous endpoint's results and request-history pagination cursors. Existing query-key prefixes and custom `queryOptions` overrides are preserved.
