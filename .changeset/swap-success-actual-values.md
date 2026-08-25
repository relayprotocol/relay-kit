---
'@relayprotocol/relay-kit-ui': patch
---

Fix the swap completion view showing a provisional token and amount as
received. Destination `actual` values from `GET /requests/v3` are now only
displayed once the request status is `success` — before that, the quoted
output token and amount are shown instead of intermediate route values (e.g.
an origin swap's USDC output on a route that delivers a different token). The
transaction modal also keeps polling the request until it reaches a terminal
status (`success`, `failure`, or `refund`) so the final received amount
replaces the quoted one.
