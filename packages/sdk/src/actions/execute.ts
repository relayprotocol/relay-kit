import type { AdaptedWallet, ProgressData, Execute } from '../types/index.js'
import { getClient } from '../client.js'
import {
  executeSteps,
  adaptViemWallet,
  getCurrentStepData,
  safeStructuredClone
} from '../utils/index.js'
import { type WalletClient } from 'viem'
import {
  isViemWalletClient,
  type AdaptViemWalletOptions
} from '../utils/viemWallet.js'
import { isDeadAddress } from '../constants/address.js'

export type ExecuteActionParameters = {
  quote: Execute
  wallet: AdaptedWallet | WalletClient
  depositGasLimit?: string
  onProgress?: (data: ProgressData) => any
} & AdaptViemWalletOptions

/**
 * Execute crosschain using Relay
 * @param data.quote A Relay quote retrieved using {@link getQuote}
 * @param data.depositGasLimit A gas limit to use in base units (wei, etc)
 * @param data.wallet Wallet object that adheres to the AdaptedWakket interface or a viem WalletClient
 * @param data.onProgress Callback to update UI state as execution progresses
 * @param abortController Optional AbortController to cancel the execution
 */
export function execute(data: ExecuteActionParameters): Promise<{
  data: Execute
  abortController: AbortController
}> & {
  abortController: AbortController
} {
  const { quote, wallet, depositGasLimit, onProgress, disableCapabilitiesCheck } =
    data
  const client = getClient()

  if (!client.baseApiUrl || !client.baseApiUrl.length) {
    throw new ReferenceError('RelayClient missing api url configuration')
  }

  let adaptedWallet: AdaptedWallet | undefined
  if (wallet) {
    adaptedWallet = isViemWalletClient(wallet)
      ? adaptViemWallet(wallet as WalletClient, { disableCapabilitiesCheck })
      : wallet
  }

  try {
    if (!adaptedWallet) {
      throw new Error('AdaptedWallet is required to execute steps')
    }

    // Instantiate a new abort controller
    const abortController = new AbortController()

    const chainId = quote.details?.currencyIn?.currency?.chainId

    if (chainId === undefined) {
      throw new Error('Missing chainId from quote')
    }

    if (isDeadAddress(quote?.details?.recipient)) {
      throw new Error('Recipient should never be burn address')
    }

    if (isDeadAddress(quote?.details?.sender)) {
      throw new Error('Sender should never be burn address')
    }

    const { request, ...restOfQuote } = quote
    const _quote = safeStructuredClone(restOfQuote)

    // Build the promise that carries out the execution
    const executionPromise: Promise<{
      data: Execute
      abortController: AbortController
    }> = new Promise((resolve, reject) => {
      executeSteps(
        chainId,
        request,
        adaptedWallet,
        ({ steps, fees, breakdown, details, refunded, error }) => {
          if (abortController.signal.aborted) {
            console.log(
              'Relay SDK: Execution aborted, skipping progress callback'
            )
            return
          }

          const { currentStep, currentStepItem, txHashes } =
            getCurrentStepData(steps)

          onProgress?.({
            steps,
            fees,
            breakdown,
            details,
            currentStep,
            currentStepItem,
            txHashes,
            refunded,
            error
          })
        },
        _quote,
        depositGasLimit
          ? {
              deposit: {
                gasLimit: depositGasLimit
              }
            }
          : undefined
      )
        .then((data) => {
          resolve({ data, abortController })
        })
        .catch(reject)
    })

    // Attach the AbortController to the promise itself so callers can access it immediately
    ;(executionPromise as any).abortController = abortController

    return executionPromise as typeof executionPromise & {
      abortController: AbortController
    }
  } catch (err: any) {
    console.error(err)
    throw err
  }
}
