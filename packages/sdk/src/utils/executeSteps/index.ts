import type {
  Execute,
  AdaptedWallet,
  TransactionStepItem
} from '../../types/index.js'
import type { AxiosRequestConfig } from 'axios'
import { getClient, RelayClient } from '../../client.js'
import { LogLevel } from '../logger.js'
import { prepareHyperliquidSteps } from '../../utils/index.js'
import {
  canBatchTransactions,
  prepareBatchTransaction
} from '../prepareBatchTransaction.js'
import { handleSignatureStepItem } from './signatureStep.js'
import { handleTransactionStepItem } from './transactionStep.js'
import { trackRequestStatus, extractDepositRequestId } from '../websocket.js'
import { handleWebSocketUpdate } from './websocketHandlers.js'

export type SetStateData = Pick<
  Execute,
  'steps' | 'fees' | 'breakdown' | 'details' | 'error' | 'refunded'
>

/**
 * Controls the coordination between WebSocket and polling mechanisms
 * to prevent duplicate status monitoring for a single execution flow
 */
export type ExecutionStatusControl = {
  websocketActive: boolean
  websocketConnected: boolean
  closeWebSocket: undefined | (() => void)
  lastKnownStatus: undefined | string
  websocketFailureTimeoutId?: ReturnType<typeof setTimeout> | null
}

/**
 * This function orchestrates the execution of multi-step operations returned from the Relay Quote API,
 * such as bridging, swapping tokens, or performing cross-chain calls. It handles transaction
 * signing, submission, and validation while providing real-time progress updates through the setState callback.
 *
 * @param chainId - The origin chain ID for execution
 * @param request - AxiosRequestConfig for API requests
 * @param wallet - Wallet adapter implementing the {@link AdaptedWallet} interface
 * @param setState - Callback function to update UI state during execution progress
 * @param newJson - Execute object containing the steps, fees, and details from Relay Quote API
 * @param stepOptions - Optional configuration for specific steps (e.g., gas limits)
 * @param sharedStatusControl - Optional shared status control object for coordinating WebSocket/polling across recursive calls
 * @returns Promise<Execute> - The final execution result with updated status
 */

export async function executeSteps(
  chainId: number,
  request: AxiosRequestConfig = {},
  wallet: AdaptedWallet,
  setState: (data: SetStateData) => any,
  newJson: Execute,
  stepOptions?: {
    [stepId: string]: {
      gasLimit?: string
    }
  },
  sharedStatusControl?: ExecutionStatusControl
): Promise<Execute> {
  const client = getClient()

  if (client?.baseApiUrl) {
    request.baseURL = client.baseApiUrl
  }
  if (request.headers) {
    request.headers['relay-sdk-version'] = client.version ?? 'unknown'
  } else {
    request.headers = {
      'relay-sdk-version': client.version ?? 'unknown'
    }
  }

  const pollingInterval = client.pollingInterval ?? 5000

  const maximumAttempts =
    client.maxPollingAttemptsBeforeTimeout ??
    (2.5 * 60 * 1000) / pollingInterval

  const chain = client.chains.find((chain) => chain.id === chainId)
  if (!chain) {
    throw `Unable to find chain: Chain id ${chainId}`
  }

  let json = newJson
  let isAtomicBatchSupported = false

  // Manage WebSocket and polling coordination
  const statusControl: ExecutionStatusControl = sharedStatusControl || {
    websocketActive: false,
    websocketConnected: false,
    closeWebSocket: undefined,
    lastKnownStatus: undefined,
    websocketFailureTimeoutId: null
  }

  // WebSocket terminal status promise - rejects when failure/refund status received
  let terminalStatusPromise: Promise<never> | null = null
  let rejectTerminalStatus: ((error: Error) => void) | null = null

  // Promise-based approach for WebSocket failure handling
  let websocketFailedPromise: Promise<void> | null = null
  let resolveWebsocketFailed: (() => void) | null = null

  const onWebsocketFailed = (): Promise<void> => {
    if (!websocketFailedPromise) {
      websocketFailedPromise = new Promise<void>((resolve) => {
        resolveWebsocketFailed = resolve
      })
    }
    return websocketFailedPromise
  }

  try {
    // Handle errors
    if (json.error || !json.steps) throw json

    // Check if step's transactions can be batched and if wallet supports atomic batch (EIP-5792)
    // If so, manipulate steps to batch transactions
    if (canBatchTransactions(json.steps)) {
      isAtomicBatchSupported = Boolean(
        wallet?.supportsAtomicBatch &&
          (await wallet?.supportsAtomicBatch(chainId))
      )
      if (isAtomicBatchSupported) {
        const batchedStep = prepareBatchTransaction(json.steps)
        json.steps = [batchedStep]
      }
    }

    // Check if Hyperliquid and if so, prepare the steps for Hyperliquid signing
    if (chainId === 1337) {
      const activeWalletChainId = await wallet?.getChainId()
      json.steps = prepareHyperliquidSteps(json.steps, activeWalletChainId)
    }

    // Update state on first call or recursion
    setState({
      steps: [...json?.steps],
      fees: { ...json?.fees },
      breakdown: json?.breakdown,
      details: json?.details
    })

    let incompleteStepIndex = -1
    let incompleteStepItemIndex = -1
    json.steps.find((step, i) => {
      if (!step.items) {
        return false
      }

      incompleteStepItemIndex = step.items.findIndex(
        (item) => item.status == 'incomplete'
      )
      if (incompleteStepItemIndex !== -1) {
        incompleteStepIndex = i
        return true
      }
    })

    // There are no more incomplete steps
    if (incompleteStepIndex === -1) {
      client.log(['Execute Steps: all steps complete'], LogLevel.Verbose)
      // Clean up WebSocket and failure timeout if execution is complete
      statusControl.closeWebSocket?.()
      clearFailureTimeout(statusControl, client)
      return json
    }

    const step = json.steps[incompleteStepIndex]

    if (stepOptions && stepOptions[step.id]) {
      const currentStepOptions = stepOptions[step.id]
      step.items?.forEach((stepItem) => {
        if (currentStepOptions.gasLimit) {
          stepItem.data.gas = currentStepOptions.gasLimit
        }
      })
    }

    let stepItems = json.steps[incompleteStepIndex].items

    if (!stepItems) {
      client.log(
        ['Execute Steps: skipping step, no items in step'],
        LogLevel.Verbose
      )
      return json
    }

    // =============================================
    // WebSocket Setup for Real-Time Status Updates
    // =============================================
    // We initialize the WebSocket connection before awaiting the step execution promises.
    //
    // The WebSocket is only used when all of these conditions are met:
    // - WebSocket is enabled in the client configuration
    // - We have a valid requestId
    // - We're on the last step of execution
    // - The step has incomplete items
    // - WebSocket isn't already active
    // - The origin and destination chain is not bitcoin
    const isLastStep = incompleteStepIndex === json.steps.length - 1
    const isStepIncomplete = stepItems.some(
      (item) => item.status === 'incomplete'
    )
    const requestId = extractDepositRequestId(json.steps)

    if (
      client.websocketEnabled &&
      requestId &&
      isLastStep &&
      isStepIncomplete &&
      !statusControl.websocketActive &&
      chainId !== 8253038
    ) {
      statusControl.websocketActive = true

      // Create the promises immediately so they're available for early failures
      websocketFailedPromise = new Promise<void>((resolve) => {
        resolveWebsocketFailed = resolve
      })

      terminalStatusPromise = new Promise<never>((_, reject) => {
        rejectTerminalStatus = reject
      })

      statusControl.closeWebSocket = trackRequestStatus({
        event: 'request.status.updated',
        requestId: requestId,
        enabled: true,
        url: client.websocketUrl,
        onOpen: () => {
          client.log(['Websocket open'], LogLevel.Verbose)
          statusControl.websocketConnected = true
        },
        onUpdate: (data) => {
          handleWebSocketUpdate({
            data,
            stepItems,
            chainId,
            setState,
            json,
            client,
            statusControl,
            onTerminalError: (error: Error) => {
              // Immediately reject when terminal status received
              rejectTerminalStatus?.(error)
            }
          })
        },
        onError: (err) => {
          // Handle WebSocket connection/network errors by falling back to polling
          if (
            !['success', 'refund'].includes(statusControl.lastKnownStatus || '')
          ) {
            client.log(
              ['Websocket connection error, falling back to polling', err],
              LogLevel.Verbose
            )
            statusControl.websocketActive = false
            statusControl.websocketConnected = false

            // Clean up any pending failure timeout when WebSocket errors
            clearFailureTimeout(statusControl, client)

            // Trigger the websocket failed promise to start polling fallback
            resolveWebsocketFailed?.()
          }
        },
        onClose: () => {
          client.log(['Websocket closed'], LogLevel.Verbose)

          // Clean up any pending failure timeout when WebSocket closes
          clearFailureTimeout(statusControl, client)

          // Only re-enable polling if we haven't reached a terminal state
          if (
            !['success', 'refund'].includes(
              statusControl.lastKnownStatus || ''
            ) &&
            !stepItems[0].error
          ) {
            client.log(
              ['Re-enabling polling due to unexpected WebSocket closure'],
              LogLevel.Verbose
            )
            // Trigger the websocket failed promise to start polling
            resolveWebsocketFailed?.()
          }
        }
      }).close
    }

    let { kind } = step

    client.log(
      [`Execute Steps: Begin processing step items for: ${step.action}`],
      LogLevel.Verbose
    )

    const promises = stepItems
      .filter((stepItem) => stepItem.status === 'incomplete')
      .map((stepItem) => {
        return new Promise(async (resolve, reject) => {
          try {
            // Create step execution promise
            const stepExecutionPromise = (async () => {
              // Handle each step based on it's kind
              switch (kind) {
                // Make an on-chain transaction
                case 'transaction': {
                  await handleTransactionStepItem({
                    stepItem: stepItem as TransactionStepItem,
                    step,
                    wallet,
                    setState,
                    request,
                    client,
                    json,
                    chainId,
                    isAtomicBatchSupported,
                    incompleteStepItemIndex,
                    stepItems,
                    onWebsocketFailed: statusControl.websocketActive
                      ? onWebsocketFailed
                      : null,
                    statusControl
                  })
                  break
                }

                // Sign a message
                case 'signature': {
                  await handleSignatureStepItem({
                    stepItem,
                    step,
                    wallet,
                    setState,
                    request,
                    client,
                    json,
                    maximumAttempts,
                    pollingInterval,
                    chain,
                    onWebsocketFailed: statusControl.websocketActive
                      ? onWebsocketFailed
                      : null
                  })
                  break
                }

                default:
                  throw new Error(
                    `Unknown step kind: ${kind}. Expected 'signature' or 'transaction'`
                  )
              }
            })()

            // Allow WebSocket terminal status (failure/refund) to immediately interrupt and stop step execution
            if (statusControl.websocketActive && terminalStatusPromise) {
              await Promise.race([stepExecutionPromise, terminalStatusPromise])
            } else {
              await stepExecutionPromise
            }

            // Mark step item as complete
            stepItem.status = 'complete'
            stepItem.progressState = 'complete'
            stepItem.isValidatingSignature = false
            setState({
              steps: [...json?.steps],
              fees: { ...json?.fees },
              breakdown: json?.breakdown,
              details: json?.details
            })
            resolve(stepItem)
          } catch (e) {
            const error = e as Error
            const errorMessage = error
              ? error.message
              : 'Error: something went wrong'

            if (error && json?.steps) {
              json.steps[incompleteStepIndex].error = errorMessage
              stepItem.error = errorMessage
              stepItem.errorData = (e as any)?.response?.data || e
              stepItem.isValidatingSignature = false
              setState({
                steps: [...json?.steps],
                fees: { ...json?.fees },
                breakdown: json?.breakdown,
                details: json?.details
              })
            }
            reject(error)
          }
        })
      })

    await Promise.all(promises)

    // Recursively call executeSteps()
    const result = await executeSteps(
      chainId,
      request,
      wallet,
      setState,
      json,
      stepOptions,
      statusControl
    )

    // Clean up WebSocket and failure timeout if execution completes
    statusControl.closeWebSocket?.()
    clearFailureTimeout(statusControl, client)

    return result
  } catch (err: any) {
    client.log(['Execute Steps: An error occurred', err], LogLevel.Error)

    // Clean up WebSocket and failure timeout on error
    statusControl.closeWebSocket?.()
    clearFailureTimeout(statusControl, client)

    const error = err && err?.response?.data ? err.response.data : err
    let refunded = false
    if (error && error.message) {
      refunded = error.message.includes('Refunded')
    } else if (error && error.includes) {
      refunded = error.includes('Refunded')
    }

    if (json) {
      json.error = error
      setState({
        steps: json.steps ? [...json.steps] : ([{}] as any),
        fees: { ...json?.fees },
        breakdown: json?.breakdown,
        details: json?.details,
        refunded: refunded,
        error
      })
    } else {
      json = {
        error,
        steps: [],
        refunded
      }
      setState(json)
    }
    throw err
  }
}

function clearFailureTimeout(
  statusControl: ExecutionStatusControl,
  client: RelayClient
): void {
  if (statusControl.websocketFailureTimeoutId) {
    clearTimeout(statusControl.websocketFailureTimeoutId)
    statusControl.websocketFailureTimeoutId = null
    client.log(['Cleared failure timeout during cleanup'], LogLevel.Verbose)
  }
}
