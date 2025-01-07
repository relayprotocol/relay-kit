# @reservoir0x/relay-sdk

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
