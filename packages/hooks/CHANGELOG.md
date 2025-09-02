# @reservoir0x/relay-kit-hooks

## 1.13.0

### Minor Changes

- 2ad3c52: Update relay branding

### Patch Changes

- Updated dependencies [2ad3c52]
  - @relayprotocol/relay-sdk@2.4.2

## 0.0.0-canary-20250822183549

### Patch Changes

- 4395d49: Fix Unverified modal buttons
- Updated dependencies [4395d49]
  - @relayprotocol/relay-sdk@0.0.0-canary-20250822183549

## 0.0.0-canary-20250822181909

### Patch Changes

- cd12eb9: Implement final share link
- Updated dependencies [cd12eb9]
  - @relayprotocol/relay-sdk@0.0.0-canary-20250822181909

## 0.0.0-canary-20250820191554

### Patch Changes

- 7badf0a: Sync with main branch
- Updated dependencies [7badf0a]
  - @relayprotocol/relay-sdk@0.0.0-canary-20250820191554

## 0.0.0-canary-20250820191315

### Patch Changes

- e3566e9: Sync with the latest main branch
- Updated dependencies [e3566e9]
  - @relayprotocol/relay-sdk@0.0.0-canary-20250820191315

## 0.0.0-canary-20250814020954

### Patch Changes

- 1d46491: Rebuild canary build
- Updated dependencies [1d46491]
  - @reservoir0x/relay-sdk@0.0.0-canary-20250814020954

## 0.0.0-canary-20250813132716

### Patch Changes

- Updated dependencies [ef840d0]
  - @reservoir0x/relay-sdk@0.0.0-canary-20250813132716

## 1.12.1

### Patch Changes

- fd0b328: Add gas sponsorship functionality
- Updated dependencies [fd0b328]
  - @relayprotocol/relay-sdk@2.4.1

## 1.12.0

### Minor Changes

- 6400542: Add websocket support and refactor executeSteps

### Patch Changes

- Updated dependencies [6400542]
  - @reservoir0x/relay-sdk@2.4.0

## 1.11.3

### Patch Changes

- Updated dependencies [1a88de0]
  - @reservoir0x/relay-sdk@2.3.2

## 1.11.2

### Patch Changes

- Updated dependencies [d1aeceb]
  - @reservoir0x/relay-sdk@2.3.1

## 1.11.1

### Patch Changes

- 7985e6b: Add relay trending tokens to token selector

## 1.11.0

### Minor Changes

- aee47ea: Upgrade viem to >=2.26.0

### Patch Changes

- Updated dependencies [aee47ea]
  - @reservoir0x/relay-sdk@2.3.0

## 1.10.6

### Patch Changes

- Updated dependencies [3dbf1be]
  - @reservoir0x/relay-sdk@2.2.0

## 1.10.5

### Patch Changes

- Updated dependencies [9e35bcd]
  - @reservoir0x/relay-sdk@2.1.3

## 1.10.4

### Patch Changes

- 3471571: Remove referrer from requests api calls

## 1.10.3

### Patch Changes

- 1da754c: Allow headers to be configured from query functions

## 1.10.2

### Patch Changes

- 1d8da8a: Update endpoints
- Updated dependencies [1d8da8a]
- Updated dependencies [6049aa6]
  - @reservoir0x/relay-sdk@2.1.2

## 1.10.1

### Patch Changes

- Updated dependencies [8b4754a]
  - @reservoir0x/relay-sdk@2.1.1

## 1.10.0

### Minor Changes

- bb63fc9: Deduplicate request IDs

### Patch Changes

- Updated dependencies [bb63fc9]
- Updated dependencies [758f8a7]
  - @reservoir0x/relay-sdk@2.1.0

## 1.9.13

### Patch Changes

- Updated dependencies [dd0f93c]
  - @reservoir0x/relay-sdk@2.0.3

## 1.9.12

### Patch Changes

- Updated dependencies [e169c87]
  - @reservoir0x/relay-sdk@2.0.2

## 1.9.11

### Patch Changes

- dab775f: Lock viem version to patch only to avoid breaking changes
- Updated dependencies [dab775f]
  - @reservoir0x/relay-sdk@2.0.1

## 1.9.10

### Patch Changes

- Updated dependencies [5759fd0]
  - @reservoir0x/relay-sdk@2.0.0

## 1.9.9

### Patch Changes

- Updated dependencies [e5d8e39]
  - @reservoir0x/relay-sdk@1.8.1

## 1.9.8

### Patch Changes

- Updated dependencies [d430ab3]
  - @reservoir0x/relay-sdk@1.8.0

## 1.9.7

### Patch Changes

- Updated dependencies [ee3693a]
  - @reservoir0x/relay-sdk@1.7.4

## 1.9.6

### Patch Changes

- 052745e: Add a quoteRequestId when requests and receiving a quote
- fe54a20: Improve quote and swap analytics
- Updated dependencies [bc85ead]
  - @reservoir0x/relay-sdk@1.7.3

## 1.9.5

### Patch Changes

- Updated dependencies [4fb4ac3]
  - @reservoir0x/relay-sdk@1.7.2

## 1.9.4

### Patch Changes

- Updated dependencies [effd487]
- Updated dependencies [af85e2a]
  - @reservoir0x/relay-sdk@1.7.1

## 1.9.3

### Patch Changes

- 6940a55: Gas top up functionality
- Updated dependencies [6940a55]
  - @reservoir0x/relay-sdk@1.7.0

## 1.9.2

### Patch Changes

- 293486b: Add additional refund reason messaging
- Updated dependencies [293486b]
  - @reservoir0x/relay-sdk@1.6.15

## 1.9.1

### Patch Changes

- Updated dependencies [b2782e9]
  - @reservoir0x/relay-sdk@1.6.14

## 1.9.0

### Minor Changes

- bf8dbdb: Breaking Changes:

  - `relay-kit-hooks`: Updated `useTokenLists` hook to use `/currencies/v2` API with new response structure
  - `relay-kit-ui`: Redesigned token selector component with improved architecture
    - Removed chain selector in favor of unified token selector component
    - Removed `defaultToToken` and `defaultFromToken` props
    - Added `toToken`, `setToToken`, `fromToken`, `setFromToken` props
    - Added `disableInputAutoFocus` and `popularChainIds` configuration options

  These changes improve token selection UX, provide better state management, and enable more flexible chain configuration.

### Patch Changes

- Updated dependencies [bf8dbdb]
  - @reservoir0x/relay-sdk@1.6.13

## 1.8.8

### Patch Changes

- Updated dependencies [66b8de8]
  - @reservoir0x/relay-sdk@1.6.12

## 1.8.7

### Patch Changes

- Updated dependencies [0af5808]
  - @reservoir0x/relay-sdk@1.6.11

## 1.8.6

### Patch Changes

- Updated dependencies [769d648]
  - @reservoir0x/relay-sdk@1.6.10

## 1.8.5

### Patch Changes

- bc77582: Add scripts for statically bundling versions
- Updated dependencies [bc77582]
- Updated dependencies [cdc8d92]
  - @reservoir0x/relay-sdk@1.6.9

## 1.8.4

### Patch Changes

- Updated dependencies [3993eb3]
  - @reservoir0x/relay-sdk@1.6.8

## 1.8.3

### Patch Changes

- Updated dependencies [f1f6d42]
  - @reservoir0x/relay-sdk@1.6.7

## 1.8.2

### Patch Changes

- 7a675e3: Swallow useQuote error if onError handler is passed
- Updated dependencies [b0d1c88]
  - @reservoir0x/relay-sdk@1.6.6

## 1.8.1

### Patch Changes

- Updated dependencies [e0133b1]
  - @reservoir0x/relay-sdk@1.6.5

## 1.8.0

### Minor Changes

- df2820a: Remove usePrice hook, queryPrice action, and PriceResponse type

### Patch Changes

- Updated dependencies [0ccd0d7]
  - @reservoir0x/relay-sdk@1.6.4

## 1.7.2

### Patch Changes

- Updated dependencies [a601dfa]
  - @reservoir0x/relay-sdk@1.6.3

## 1.7.1

### Patch Changes

- Updated dependencies [1bf4aa7]
- Updated dependencies [4215d2e]
  - @reservoir0x/relay-sdk@1.6.2

## 1.7.0

### Minor Changes

- dc81aac: OnrampWidget and useTokenPrice hook

## 1.6.1

### Patch Changes

- Updated dependencies [5a9208f]
  - @reservoir0x/relay-sdk@1.6.1

## 1.6.0

### Minor Changes

- 3ae98ed: Add support for batch transactions

### Patch Changes

- 80aba91: Add support for EIP-5792 batch transactions
- Updated dependencies [3ae98ed]
- Updated dependencies [80aba91]
  - @reservoir0x/relay-sdk@1.6.0

## 1.5.0

### Minor Changes

- 1effc86: Upgrade viem peer dependency

### Patch Changes

- Updated dependencies [1effc86]
  - @reservoir0x/relay-sdk@1.5.0

## 1.4.16

### Patch Changes

- 9928dbc: Add quote_error analytics event

## 1.4.15

### Patch Changes

- Updated dependencies [7d6f035]
- Updated dependencies [f81fbfa]
  - @reservoir0x/relay-sdk@1.4.10

## 1.4.14

### Patch Changes

- Updated dependencies [2b257cd]
  - @reservoir0x/relay-sdk@1.4.9

## 1.4.13

### Patch Changes

- 91e7d85: Fix useRequests base url

## 1.4.12

### Patch Changes

- 1a593b5: feat: optimize usePrice hook to skip invalid canonical routes

## 1.4.11

### Patch Changes

- 561b396: Deposit Address fallback functionality

## 1.4.10

### Patch Changes

- Updated dependencies [bb5a8d0]
  - @reservoir0x/relay-sdk@1.4.8

## 1.4.9

### Patch Changes

- Updated dependencies [a52745f]
  - @reservoir0x/relay-sdk@1.4.7

## 1.4.8

### Patch Changes

- 1c68705: Fix usePrice error handling

## 1.4.7

### Patch Changes

- Updated dependencies [69df434]
  - @reservoir0x/relay-sdk@1.4.6

## 1.4.6

### Patch Changes

- Updated dependencies [0292590]
  - @reservoir0x/relay-sdk@1.4.5

## 1.4.5

### Patch Changes

- Updated dependencies [2ea4fde]
  - @reservoir0x/relay-sdk@1.4.4

## 1.4.4

### Patch Changes

- Updated dependencies [3dd7177]
  - @reservoir0x/relay-sdk@1.4.3

## 1.4.3

### Patch Changes

- Updated dependencies [631f997]
  - @reservoir0x/relay-sdk@1.4.2

## 1.4.2

### Patch Changes

- f18951c: Fetch price and quote in parallel to improve price accuracy in SwapWidget

## 1.4.1

### Patch Changes

- Updated dependencies [6237949]
  - @reservoir0x/relay-sdk@1.4.1

## 1.4.0

### Minor Changes

- d3f975d: Remove automatic refresh of quote data after execution in useQuote hook

### Patch Changes

- Updated dependencies [07917f6]
  - @reservoir0x/relay-sdk@1.4.0

## 1.3.4

### Patch Changes

- Updated dependencies [2134530]
  - @reservoir0x/relay-sdk@1.3.4

## 1.3.3

### Patch Changes

- Updated dependencies [3f88d12]
  - @reservoir0x/relay-sdk@1.3.3

## 1.3.2

### Patch Changes

- Updated dependencies [277bfc5]
  - @reservoir0x/relay-sdk@1.3.2

## 1.3.1

### Patch Changes

- Updated dependencies [2c38afe]
  - @reservoir0x/relay-sdk@1.3.1

## 1.3.0

### Minor Changes

- a8215cf: Abstract txs in Adapted Wallet + new Solana Adapter

### Patch Changes

- Updated dependencies [a8215cf]
  - @reservoir0x/relay-sdk@1.3.0

## 1.2.5

### Patch Changes

- Updated dependencies [41feac9]
  - @reservoir0x/relay-sdk@1.2.2

## 1.2.4

### Patch Changes

- 7a084fa: New swap widget ui
- Updated dependencies [7a084fa]
  - @reservoir0x/relay-sdk@1.2.1

## 1.2.3

### Patch Changes

- Updated dependencies [9e14a17]
  - @reservoir0x/relay-sdk@1.2.0

## 1.2.2

### Patch Changes

- Updated dependencies [78c6ed0]
  - @reservoir0x/relay-sdk@1.1.2

## 1.2.1

### Patch Changes

- Updated dependencies [28ed450]
  - @reservoir0x/relay-sdk@1.1.1

## 1.2.0

### Minor Changes

- b9db008: Upgrade /requests api to /requests/v2

## 1.1.0

### Minor Changes

- 105d1b8: Switch from execute/swap to quote api

### Patch Changes

- Updated dependencies [c158099]
- Updated dependencies [105d1b8]
  - @reservoir0x/relay-sdk@1.1.0

## 1.0.19

### Patch Changes

- Updated dependencies [b342c8d]
  - @reservoir0x/relay-sdk@1.0.13

## 1.0.18

### Patch Changes

- Updated dependencies [ec9b20f]
  - @reservoir0x/relay-sdk@1.0.12

## 1.0.17

### Patch Changes

- Updated dependencies [92b9c71]
  - @reservoir0x/relay-sdk@1.0.11

## 1.0.16

### Patch Changes

- fac3415: Fix chain widget testnet configuration

## 1.0.15

### Patch Changes

- Add review quote step, refactor modal renderers
- 2d22eec: Add usePrice hook
- Updated dependencies
- Updated dependencies [2d22eec]
  - @reservoir0x/relay-sdk@1.0.10

## 1.0.14

### Patch Changes

- Updated dependencies [3648ec3]
- Updated dependencies [be74a6a]
  - @reservoir0x/relay-sdk@1.0.9

## 1.0.13

### Patch Changes

- Updated dependencies [1e83361]
  - @reservoir0x/relay-sdk@1.0.8

## 1.0.12

### Patch Changes

- 4335c35: Add tests and fix global axios instance
- Updated dependencies [4335c35]
  - @reservoir0x/relay-sdk@1.0.7

## 1.0.11

### Patch Changes

- 5c1a210: Fix source getting overriden in useQuote hook

## 1.0.10

### Patch Changes

- ec5e68e: Fix useQuote hook source

## 1.0.9

### Patch Changes

- Updated dependencies [5184197]
  - @reservoir0x/relay-sdk@1.0.6

## 1.0.8

### Patch Changes

- 1945809: Move wallet chain id check to further in the flow
- Updated dependencies [1945809]
  - @reservoir0x/relay-sdk@1.0.5

## 1.0.7

### Patch Changes

- 813be48: Add onSuccess and onError callbacks for SwapWidget

## 1.0.6

### Patch Changes

- Updated dependencies [6b5015b]
  - @reservoir0x/relay-sdk@1.0.4

## 1.0.5

### Patch Changes

- 2922c29: Add useRelayConfig hook
- Updated dependencies [772b657]
  - @reservoir0x/relay-sdk@1.0.3

## 1.0.4

### Patch Changes

- ce46e72: Strip layers from generated ui kit stylesheet
- Updated dependencies [ce46e72]
  - @reservoir0x/relay-sdk@1.0.2

## 1.0.3

### Patch Changes

- 592feb1: Make tanstack query a peer dependency

## 1.0.2

### Patch Changes

- 2c6d3da: Fix esm import errors

## 1.0.1

### Patch Changes

- 4a55654: Fix deploy script
- Updated dependencies [4a55654]
  - @reservoir0x/relay-sdk@1.0.1

## 1.0.0

### Major Changes

- ba72406: Refactor SDK to simplify, add ui packages

### Patch Changes

- Updated dependencies [ba72406]
  - @reservoir0x/relay-sdk@1.0.0
