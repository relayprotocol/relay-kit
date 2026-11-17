---
'@relayprotocol/relay-sdk': major
'@relayprotocol/relay-kit-hooks': major
'@relayprotocol/relay-kit-ui': major
---

`getQuote`, `useQuote`, `queryQuote` and the Swap, Onramp and deposit address widgets now quote with `POST /quote/v3` instead of `POST /quote/v2`, which Relay deprecates on November 25, 2026 and retires on February 23, 2027. See https://docs.relay.link/references/api/api_guides/migrating-to-quote-v3.

**Breaking**

- `/quote/v3` requires authentication. Server-side clients set `apiKey`; browser apps point `baseApiUrl` at a proxy that adds `x-api-key`, as the UI kit already requires for `GET /requests/v3`. Unauthenticated requests fail with `401` and `errorCode: "UNAUTHORIZED_QUOTE"`. `useQuote` now sends the client's `apiKey` when `baseApiUrl` is the Relay API, like `getQuote`.
- `QuoteBody` no longer accepts `useExternalLiquidity` or `useFallbacks`, and the API rejects any parameter it does not know with `400` and `errorCode: "INVALID_REQUEST_PARAMS"`. Remove them, and any other extra field such as `source`, from `options`.
- `Execute['fees']` (`QuoteFees`) is the quote/v3 fee breakdown: `execution`, `swap`, `platform`, `app` and `sponsored`, each `{ usd, amount, amountFormatted }`, plus one `currency`. Costs have a negative `usd`. Read `fees.platform` instead of `fees.relayerService` or `details.expandedPriceImpact.relay`, `fees.sponsored` instead of `fees.subsidized`, and the new `Execute['originGas']` instead of `fees.gas`. `fees.relayer` and `fees.relayerGas` are gone, and `details.expandedPriceImpact` is removed; `details.rate` and `details.userBalance` are strings.
- `Execute['feeSponsorship']` uses the `GET /requests/v3` shape (`relay` is named `platform`, one shared `currency`), and `Execute['protocol']` is added.
- A step's `depositAddress` is an object `{ address, type, depositor, depositTxHash, recoveryAddress }` instead of a string; read `depositAddress.address`.
- `QuoteStepId` is `'deposit' | 'approve' | 'authorize' | 'swap' | 'send'`: `authorize1` and `authorize2` are now both `authorize`. Tell repeated ids apart by position.
- Quotes return flat steps. `getQuote` returns the new `Quote` type and `useQuote`'s `QuoteResponse` is now `Quote`: each `QuoteStep` carries `status`, `data` and `check` directly, with no `items` array and no `step.requestId`. Read `quote.steps[i].data` instead of `quote.steps[i].items[0].data`, and use the top-level `quote.requestId`. The Onramp widget's `onSuccess` and `onError` now receive a `Quote`.

`execute` and `executeGaslessBatch` take a `Quote`. Execution progress keeps its shape: `onProgress` and the result of `execute` still report steps with `items`. To read a quote's steps in that shape, call the new `normalizeSteps(quote.steps, quote.requestId)` export. Signature steps post to `/execute/permits/v2` and status checks use `/intents/status/v3`, as the quote's steps specify. Hyperliquid deposits now also poll `/intents/status/v3`.
