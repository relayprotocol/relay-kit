import type { PublicClient } from 'viem'
import {
  EVM_GAS_BUFFER_MULTIPLIER,
  MINIMUM_GAS_PRICE_WEI,
  SOLANA_FEE_BUFFER_MULTIPLIER,
  SOLANA_DEFAULT_FEE_LAMPORTS,
  ECLIPSE_FEE_BUFFER_MULTIPLIER,
  ECLIPSE_DEFAULT_FEE_WEI,
  EVM_DEFAULT_FEE_WEI
} from '../constants/maxGasBuffer.js'
import { MAINNET_RELAY_API } from '@relayprotocol/relay-sdk'
import { queryRequests } from '@relayprotocol/relay-kit-hooks'
import type { ChainVM } from '@relayprotocol/relay-sdk'
import { getCacheEntry, setCacheEntry } from './localStorage.js'

// Refs to store ongoing fetch promises
const fetchPromises: Record<string, Promise<bigint>> = {}

/**
 * Calculates the gas buffer needed for a native EVM token transfer.
 * This buffer is estimated based on gas price and a standard limit,
 * then multiplied by a safety factor.
 *
 * @param publicClient - A VIEM PublicClient connected to the EVM chain.
 * @param balance - The total native balance of the user (used for early exit).
 * @param gasLimit - Optional: The gas limit to use for estimation (defaults to 400000n).
 * @returns The calculated gas buffer amount as a bigint, or 0n if estimation fails or balance is zero.
 */
export async function calculateEvmNativeGasBuffer(
  publicClient: PublicClient,
  balance: bigint,
  gasLimit: bigint = 400000n
): Promise<bigint> {
  if (!balance || balance <= 0n) {
    return 0n
  }

  // Fixed fallback buffer: 0.005 ETH in Wei
  const defaultBuffer = EVM_DEFAULT_FEE_WEI

  try {
    let feeData
    try {
      feeData = await publicClient.estimateFeesPerGas()
    } catch (eip1559Error) {
      // Fallback to legacy gas price estimation
      try {
        const gasPrice = await publicClient.getGasPrice()
        feeData = {
          maxFeePerGas: gasPrice,
          gasPrice: gasPrice
        }
      } catch (legacyError) {
        // If both estimations fail, return fallback buffer
        console.error('Failed to estimate gas price:', legacyError)
        return defaultBuffer
      }
    }

    // Prefer EIP-1559 maxFeePerGas if available, otherwise use gasPrice
    let gasPriceToUse = feeData.maxFeePerGas ?? feeData.gasPrice

    if (!gasPriceToUse || gasPriceToUse <= 0n) {
      console.error('Invalid gas price data received:', feeData)
      return defaultBuffer
    }

    if (gasPriceToUse < MINIMUM_GAS_PRICE_WEI) {
      gasPriceToUse = MINIMUM_GAS_PRICE_WEI
    }

    const estimatedGasCost = gasPriceToUse * gasLimit
    const buffer = estimatedGasCost * EVM_GAS_BUFFER_MULTIPLIER

    // return the calculated buffer
    return buffer
  } catch (error) {
    console.error('Error calculating EVM native gas buffer:', error)
    return defaultBuffer
  }
}

/**
 * Calculates the fee buffer needed for a native SVM (e.g., Solana) or Eclipse transaction.
 * Uses specific multipliers and default fees for each type.
 * Falls back to a default fee if API data is unavailable or invalid.
 *
 * @param chainId - The chain ID of the SVM or Eclipse network.
 * @returns The calculated fee buffer amount (in lamports for Solana, Wei for Eclipse) as a bigint, or a fallback buffer if estimation fails.
 */
export async function calculateSvmNativeFeeBuffer(
  chainId: number
): Promise<bigint> {
  const isEclipseChain = chainId === 9286185
  const multiplier = isEclipseChain
    ? ECLIPSE_FEE_BUFFER_MULTIPLIER
    : SOLANA_FEE_BUFFER_MULTIPLIER

  const fallbackBuffer = isEclipseChain
    ? ECLIPSE_DEFAULT_FEE_WEI * ECLIPSE_FEE_BUFFER_MULTIPLIER
    : SOLANA_DEFAULT_FEE_LAMPORTS * SOLANA_FEE_BUFFER_MULTIPLIER

  try {
    const queryOptions = {
      limit: 20,
      originChainId: chainId
    } as const

    const resp = await queryRequests(MAINNET_RELAY_API, queryOptions)

    if (!resp || !Array.isArray(resp.requests) || resp.requests.length === 0) {
      console.warn('No valid fees found in response. Using fallback buffer.')
      return fallbackBuffer
    }

    // Extract fees data from the response
    const fees: bigint[] = resp.requests
      .map((r: any) => {
        const feeStr = r?.data?.inTxs?.[0]?.fee
        try {
          return BigInt(feeStr)
        } catch {
          return null
        }
      })
      .filter((f: bigint | null): f is bigint => f !== null)

    if (fees.length === 0) {
      return fallbackBuffer
    }

    // Find the maximum fee among the valid fees
    const maxFee = fees.reduce(
      (max, current) => (current > max ? current : max),
      0n
    )

    // Apply buffer multiplier to the maximum fee
    const buffer = maxFee * multiplier

    return buffer
  } catch (error) {
    console.error('Error calculating SVM native fee buffer:', error)
    return fallbackBuffer
  }
}

/**
 * Gets the fee buffer amount for a given chain and VM type.
 * Handles caching, ongoing fetch promises, and initiates calculation if needed.
 *
 * @param vmType - The virtual machine type ('evm' or 'svm').
 * @param chainId - The chain ID.
 * @param balance - The current balance (required for EVM calculation).
 * @param publicClient - VIEM PublicClient (required for EVM calculation).
 * @returns A promise that resolves to the fee buffer amount as a bigint.
 */
export async function getFeeBufferAmount(
  vmType: ChainVM | undefined | null,
  chainId: number | undefined | null,
  balance: bigint,
  publicClient: PublicClient | null
): Promise<bigint> {
  const cacheKey = `${vmType}FeeBuffer:${chainId}`
  const cachedBufferStr = getCacheEntry(cacheKey)

  if (cachedBufferStr) {
    return BigInt(cachedBufferStr)
  }

  // Check if a fetch is already in progress
  if (Object.prototype.hasOwnProperty.call(fetchPromises, cacheKey)) {
    return fetchPromises[cacheKey]
  }

  // Initiate fetch
  let calculationPromise: Promise<bigint>

  if (vmType === 'evm') {
    if (!publicClient) {
      console.error('PublicClient is required for EVM fee buffer calculation.')
      return EVM_DEFAULT_FEE_WEI * EVM_GAS_BUFFER_MULTIPLIER
    }
    calculationPromise = calculateEvmNativeGasBuffer(publicClient, balance)
  } else if (vmType === 'svm') {
    const isEclipseChain = chainId === 9286185
    const fallbackBuffer = isEclipseChain
      ? ECLIPSE_DEFAULT_FEE_WEI * ECLIPSE_FEE_BUFFER_MULTIPLIER
      : SOLANA_DEFAULT_FEE_LAMPORTS * SOLANA_FEE_BUFFER_MULTIPLIER
    calculationPromise = calculateSvmNativeFeeBuffer(chainId!).catch(
      (error) => {
        console.error(
          `Failed to calculate SVM fee buffer for chain ${chainId}:`,
          error
        )
        return fallbackBuffer
      }
    )
  } else {
    console.warn(
      `Unsupported VM type encountered: ${vmType}. Returning default EVM buffer.`
    )
    return EVM_DEFAULT_FEE_WEI * EVM_GAS_BUFFER_MULTIPLIER
  }

  // Store the promise
  fetchPromises[cacheKey] = calculationPromise

  // Handle caching and cleanup after promise settles
  calculationPromise
    .then((buffer) => {
      setCacheEntry(cacheKey, buffer, 5)
    })
    .catch((error) => {
      console.error(`Error processing fee buffer for ${cacheKey}:`, error)
    })
    .finally(() => {
      delete fetchPromises[cacheKey]
    })

  return calculationPromise
}
