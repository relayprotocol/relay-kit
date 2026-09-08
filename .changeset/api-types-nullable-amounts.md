---
'@relayprotocol/relay-kit-hooks': major
'@relayprotocol/relay-kit-ui': major
'@relayprotocol/relay-sdk': major
---

`paths` and `routes` now track the current Relay API. Three endpoints are gone, request
amount fields are nullable, and deposit addresses, fee sponsorship and route racing gained
new options.

**Breaking**

- `/execute/swap`, `/requests/{requestId}/signature` and `/requests/{requestId}/signature/v2`
  are removed from `paths` and from the exported `routes` array. Quotes come from
  `POST /quote/v2`. `SwapBreakdown` and `Execute['breakdown']` are unchanged — the SDK now
  declares that shape directly instead of deriving it from `/execute/swap`.
- On `GET /requests/v2` and `GET /requests/v3`, amount-bearing fields are now `string | null`
  rather than `string | undefined`: `appFees[]` / `paidAppFees[]` (`recipient`, `bps`,
  `amount`, `amountUsd`, `amountUsdCurrent`), `data.fees.*` (`usd`, `amount`,
  `amountFormatted`) and `data.route.*` currency amounts (`amount`, `amountFormatted`,
  `amountUsd`, `minimumAmount`). This reaches `useRequests`, `queryRequests` and
  `useDepositAddressStatus`. Passing one of these into a `string | undefined` slot no longer
  compiles — use `?? undefined`, or widen the receiving type to accept `null`.
- `ChainVM` gains `'hederavm'`. An exhaustive `switch` over `ChainVM` with a `never`
  fallthrough needs the new case.
- `GET /config/v2` no longer accepts `currency: "degen"` or `"usdh"`, and `GET /prices/rates`
  no longer returns `DEGEN`. Remove references to those literals; `"ausd"` is now accepted.

**Added**

- `GET /deposit-addresses/v2` returns a deposit address with its `deposits` and `sweeps`
  history, and `POST /deposit-addresses/{depositAddressId}/disable/v2` disables one.
  `/quote` and `/quote/v2` responses now carry `requestId` and, on deposit-address steps,
  `depositAddressId`.
- Quote request options: `subsidizationBps` (share of each sponsored fee component the
  sponsor covers, applied before `maxSubsidizationAmount`), `indicativeQuote`,
  `referencePrice`, `useRouteRacing` and `routeRacingMinUsdSize`. `subsidizationBps` is
  echoed back in `feeSponsorship` on quotes and requests.
- `GET /requests/v3` accepts a `referrer` filter (requires `apiKey`) and returns `apiKeyName`
  and `blockedAddresses` to the request's creator integrator. `GET /requests/v2` responses
  carry a `deprecation` block with its sunset and successor.
- `MANUAL_REFUND_REQUIRED` joins `refundFailReason`; `GET /intents/status/v3` now reports
  `failReason` and `refundFailReason`; `GET /withdrawals/status` returns `txHash`;
  `hederavm` joins the chain VM types.

**Deprecated**

- The `strict` quote parameter is ignored by `/quote/v2`; deposit-address creation follows
  the requested trade type.
