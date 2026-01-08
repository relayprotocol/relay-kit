/**
 * Chain Utilities
 *
 * This module contains utilities that involve heavier viem chain imports.
 * Import from this subpath only if you need these specific utilities.
 *
 * @example
 * ```ts
 * import { configureViemChain, configureDynamicChains } from '@relayprotocol/relay-sdk/chain-utils'
 * ```
 */

export { configureViemChain } from './configureViemChain.js'
export { configureDynamicChains } from './configureDynamicChains.js'
export { fetchChainConfigs } from './fetchChainConfigs.js'
