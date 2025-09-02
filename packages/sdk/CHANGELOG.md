# @reservoir0x/relay-sdk

## 2.4.2

### Patch Changes

- 2ad3c52: Update relay branding

## 0.0.0-canary-20250822183549

### Patch Changes

- 4395d49: Fix Unverified modal buttons

## 0.0.0-canary-20250822181909

### Patch Changes

- cd12eb9: Implement final share link

## 0.0.0-canary-20250820191554

### Patch Changes

- 7badf0a: Sync with main branch

## 0.0.0-canary-20250820191315

### Patch Changes

- e3566e9: Sync with the latest main branch

## 0.0.0-canary-20250814020954

### Patch Changes

- 1d46491: Rebuild canary build

## 0.0.0-canary-20250813132716

### Minor Changes

- ef840d0: Update theme to better match Relay brand

## 2.4.1

### Patch Changes

- fd0b328: Add gas sponsorship functionality

## 2.4.0

### Minor Changes

- 6400542: Add websocket support and refactor executeSteps

## 2.3.2

### Patch Changes

- 1a88de0: Add hyperliquid usd send functionality

## 2.3.1

### Patch Changes

- d1aeceb: Enable protocol v2 for chains programatically

## 2.3.0

### Minor Changes

- aee47ea: Upgrade viem to >=2.26.0

## 2.2.0

### Minor Changes

- 3dbf1be: Upgrade sdk types and add custom logic for blast protocol v2 configuration

## 2.1.3

### Patch Changes

- 9e35bcd: Add getAppFees and claimAppFees sdk actions

## 2.1.2

### Patch Changes

- 1d8da8a: Update endpoints
- 6049aa6: Add hypevm to vmtypes for destination

## 2.1.1

### Patch Changes

- 8b4754a: Allow changing the polling interval for confirmation and improve RPC configuration

## 2.1.0

### Minor Changes

- bb63fc9: Deduplicate request IDs

### Patch Changes

- 758f8a7: Optimize same chain swapping to skip intent status if slower than receipt

## 2.0.3

### Patch Changes

- dd0f93c: Improve DEPOSIT_SUCCESS logic by checking pending status

## 2.0.2

### Patch Changes

- e169c87: Sync api types

## 2.0.1

### Patch Changes

- dab775f: Lock viem version to patch only to avoid breaking changes

## 2.0.0

### Major Changes

- 5759fd0: [BREAKING] Update sdk getQuote method to optionally include defaults

## 1.8.1

### Patch Changes

- e5d8e39: Sync api types

## 1.8.0

### Minor Changes

- d430ab3: Overhaul analytics events

## 1.7.4

### Patch Changes

- ee3693a: Add sui wallet adapter

## 1.7.3

### Patch Changes

- bc85ead: Add ability to override default logger

## 1.7.2

### Patch Changes

- 4fb4ac3: Fix add ethereum chain errors

## 1.7.1

### Patch Changes

- effd487: Add fallback mechanism when InternalJSONRPC occurrs
- af85e2a: Sync sdk types and update sugested tokens to use logoURI from featured tokens

## 1.7.0

### Minor Changes

- 6940a55: Gas top up functionality

## 1.6.15

### Patch Changes

- 293486b: Add additional refund reason messaging

## 1.6.14

### Patch Changes

- b2782e9: Add endpoint to APIError for debugging

## 1.6.13

### Patch Changes

- bf8dbdb: Breaking Changes:

  - `relay-kit-hooks`: Updated `useTokenLists` hook to use `/currencies/v2` API with new response structure
  - `relay-kit-ui`: Redesigned token selector component with improved architecture
    - Removed chain selector in favor of unified token selector component
    - Removed `defaultToToken` and `defaultFromToken` props
    - Added `toToken`, `setToToken`, `fromToken`, `setFromToken` props
    - Added `disableInputAutoFocus` and `popularChainIds` configuration options

  These changes improve token selection UX, provide better state management, and enable more flexible chain configuration.

## 1.6.12

### Patch Changes

- 66b8de8: Fix hyperevm chain configuration

## 1.6.11

### Patch Changes

- 0af5808: Update API SDK types, fix react 19 component type issues

## 1.6.10

### Patch Changes

- 769d648: Add Sui VM support

## 1.6.9

### Patch Changes

- bc77582: Add scripts for statically bundling versions
- cdc8d92: Handle custom block explorer transaction page

## 1.6.8

### Patch Changes

- 3993eb3: Update Tron dead address

## 1.6.7

### Patch Changes

- f1f6d42: Tron support

## 1.6.6

### Patch Changes

- b0d1c88: Fix sender sometimes being set to dead address

## 1.6.5

### Patch Changes

- e0133b1: Check tx confirmation error with tenderly api to enhance error data

## 1.6.4

### Patch Changes

- 0ccd0d7: SDK config option to omit gas fee estimates

## 1.6.3

### Patch Changes

- a601dfa: Handle confirmation error appropriately

## 1.6.2

### Patch Changes

- 1bf4aa7: Sync api types, append moonpay id to relay request
- 4215d2e: Fix solver status timeout ui bug and split error into sub error

## 1.6.1

### Patch Changes

- 5a9208f: Post same chain tx to solver to fix status timeout errors

## 1.6.0

### Minor Changes

- 3ae98ed: Add support for batch transactions

### Patch Changes

- 80aba91: Add support for EIP-5792 batch transactions

## 1.5.0

### Minor Changes

- 1effc86: Upgrade viem peer dependency

## 1.4.10

### Patch Changes

- 7d6f035: Improve robustness of pre tx chain id check
- f81fbfa: Fix dead address being allowed as burn address

## 1.4.9

### Patch Changes

- 2b257cd: Expose instructions in signature function

## 1.4.8

### Patch Changes

- bb5a8d0: Fix typescript error in RelayChain

## 1.4.7

### Patch Changes

- a52745f: Update zero address for zero chain

## 1.4.6

### Patch Changes

- 69df434: Support for eclipse svm

## 1.4.5

### Patch Changes

- 0292590: Add suggested tokens to token selector

## 1.4.4

### Patch Changes

- 2ea4fde: Impprove wallet switch error handling

## 1.4.3

### Patch Changes

- 3dd7177: Update solana dead address

## 1.4.2

### Patch Changes

- 631f997: Add support for unverified tokens

## 1.4.1

### Patch Changes

- 6237949: Fix bugs with bitcoin implementation

## 1.4.0

### Minor Changes

- 07917f6: Bitcoin support

## 1.3.4

### Patch Changes

- 2134530: Replace exact_output with expected_output tradeType

## 1.3.3

### Patch Changes

- 3f88d12: Fix switchChain logic to take into account missing chain in wallet

## 1.3.2

### Patch Changes

- 277bfc5: Fix wallet switching in ChainWidget, fix sdk convert viem chain to RelayChain helper

## 1.3.1

### Patch Changes

- 2c38afe: Add solana ui support in SwapWidget

## 1.3.0

### Minor Changes

- a8215cf: Abstract txs in Adapted Wallet + new Solana Adapter

## 1.2.2

### Patch Changes

- 41feac9: Expand support for svm chains when setting addresses

## 1.2.1

### Patch Changes

- 7a084fa: New swap widget ui

## 1.2.0

### Minor Changes

- 9e14a17: Better handling of transaction in flight and post transaction ui, handle refund status when polling for transaction success

## 1.1.2

### Patch Changes

- 78c6ed0: Add getPrice action

## 1.1.1

### Patch Changes

- 28ed450: Update sdk api types

## 1.1.0

### Minor Changes

- 105d1b8: Switch from execute/swap to quote api

### Patch Changes

- c158099: Drop lodash cloneDeep in favor of native cloning

## 1.0.13

### Patch Changes

- b342c8d: Add support for iconUrl chain icon override

## 1.0.12

### Patch Changes

- ec9b20f: Add supportsBridging to Relay Chain

## 1.0.11

### Patch Changes

- 92b9c71: Sync api types

## 1.0.10

### Patch Changes

- Add review quote step, refactor modal renderers
- 2d22eec: Add usePrice hook

## 1.0.9

### Patch Changes

- 3648ec3: Better contextualize actions based on operation
- be74a6a: Add blockProductionLagging to RelayChain

## 1.0.8

### Patch Changes

- 1e83361: Fix json error spreading throwing error in executeSteps

## 1.0.7

### Patch Changes

- 4335c35: Add tests and fix global axios instance

## 1.0.6

### Patch Changes

- 5184197: Improve post transaction polling to increase speed

## 1.0.5

### Patch Changes

- 1945809: Move wallet chain id check to further in the flow

## 1.0.4

### Patch Changes

- 6b5015b: Add request to quote to be passed into execute function

## 1.0.3

### Patch Changes

- 772b657: Optimize the way we import lodash

## 1.0.2

### Patch Changes

- ce46e72: Strip layers from generated ui kit stylesheet

## 1.0.1

### Patch Changes

- 4a55654: Fix deploy script

## 1.0.0

### Major Changes

- ba72406: Refactor SDK to simplify, add ui packages

## 0.7.0

### Minor Changes

- a77e30f: Migrate to v2 of call and bridge api

## 0.6.2

### Patch Changes

- 820021e: Make txs a first class parameter in swap action

## 0.6.1

### Patch Changes

- 6ae4f8d: Support swap + extra call txs

## 0.6.0

### Minor Changes

- 309af6e: Upgrade getSolverCapacity method to use config v2 api

### Patch Changes

- 96db714: Add square icons to Relay Chain
- 47a8aed: Move sdk methods to actions
- 31fecc5: Add progress state
- bce691b: Improve typescript fee execute types

## 0.5.4

### Patch Changes

- 8ef9ba6: Post deposit transactions to solver
- 9799870: Fix return types for get quote methods

## 0.5.3

### Patch Changes

- dd34345: Fix internal txhash chain id

## 0.5.2

### Patch Changes

- e795842: Await tx receipt for transaction steps

## 0.5.1

### Patch Changes

- 597371e: Swaps action and getSwapQuote method

## 0.5.0

### Minor Changes

- 74e12e1: Swap SDK action

### Patch Changes

- e0f2219: Sync types

## 0.4.0

### Minor Changes

- fc2f8ce: Improve onProgress action callback to be easier to use

### Patch Changes

- 84a2ea8: Update sdk readme

## 0.3.10

### Patch Changes

- 0dbeb4a: Sync api types + add useExactInput parameter to demo

## 0.3.9

### Patch Changes

- 4239703: Remove requestId from Execute type

## 0.3.8

### Patch Changes

- 19019b4: Skip check object if bridge is canonical

## 0.3.7

### Patch Changes

- 96d0990: Sync api types

## 0.3.6

### Patch Changes

- c9d17bb: Sync API types

## 0.3.5

### Patch Changes

- 952b5a6: Add currency id to RelayChain type

## 0.3.4

### Patch Changes

- 8bd3d17: Sync api types

## 0.3.3

### Patch Changes

- 0f291dc: Handle inTxHashes for signature step items

## 0.3.2

### Patch Changes

- a76f067: Add isValidatingSignature to step item

## 0.3.1

### Patch Changes

- f9dff0c: Sync api types and add erc20Currencies to RelayChain

## 0.3.0

### Minor Changes

- e41c632: Update bridge action to use new bridge api + usdc support

### Patch Changes

- a572a48: Handle rainbow wallet bug where txHash of "null" is returned when tx rejected

## 0.2.5

### Patch Changes

- 180d1c7: Omit duplicate types from call and bridge action options
- 4910cbf: Return route breakdown in onProgress callback
- f454345: Remove tx intent trigger api call

## 0.2.4

### Patch Changes

- ade63ae: Sync sdk types with api
- 2624964: Added readme to sdk

## 0.2.3

### Patch Changes

- 10c3e03: Make wallet parameter optional for get quote methods

## 0.2.2

### Patch Changes

- 90e4d58: Add ability to pass in a gasLimit for deposit transactions
- 8a5fdda: Add currentStep and currentStep item to onProgress callback

## 0.2.1

### Patch Changes

- b59c35a: Add getSolverCapacity, getCallQuote, getBridgeQuote methods

## 0.2.0

### Minor Changes

- 53f089b: Handle mismatched chain prior to execution

### Patch Changes

- 0fbab53: Add simplified bridge action for convenience

## 0.1.0

### Minor Changes

- 547425d: Upgrade wagmi, viem and rainbowkit to v2

### Patch Changes

- bad65fe: Automatic source detection

## 0.0.13

### Patch Changes

- 3c6c3fc: Add source attribution parameter to call action

## 0.0.12

### Patch Changes

- 60854a6: Improve chain conversion by using viem chains if available or fallback to api chain data
