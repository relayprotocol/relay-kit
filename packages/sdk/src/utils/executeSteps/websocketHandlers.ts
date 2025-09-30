import type { Execute } from '../../types/index.js'
import type { RequestStatusUpdatedPayload } from '../websocket.js'
import type { SetStateData } from './index.js'
import { LogLevel } from '../logger.js'
import type { RelayClient } from '../../client.js'

interface WebSocketUpdateHandlerParams {
  data: RequestStatusUpdatedPayload
  stepItems: Execute['steps'][0]['items']
  chainId: number
  setState: (data: SetStateData) => void
  json: Execute
  client: RelayClient
  statusControl: {
    closeWebSocket?: () => void
    lastKnownStatus?: string
    websocketFailureTimeoutId?: ReturnType<typeof setTimeout> | null
  }
  onTerminalError?: (error: Error) => void
}

export function handleWebSocketUpdate({
  data,
  stepItems,
  chainId,
  setState,
  json,
  client,
  statusControl,
  onTerminalError
}: WebSocketUpdateHandlerParams): void {
  statusControl.lastKnownStatus = data.status

  // Clear any existing failure timeout if we receive a non-failure status
  // This handles the case where failure -> pending -> refund flow occurs
  if (data.status !== 'failure') {
    clearFailureTimeout(
      statusControl,
      client,
      `status changed to ${data.status}`
    )
  }

  // Handle terminal states (success, refund)
  if (isTerminalStatus(data.status)) {
    client.log(
      ['WebSocket received terminal status: ', data.status],
      LogLevel.Verbose
    )
    statusControl.closeWebSocket?.()

    switch (data.status) {
      case 'success':
        handleSuccessStatus(data, stepItems, chainId, setState, json, client)
        break
      case 'refund':
        handleRefundStatus(client, stepItems, onTerminalError)
        break
    }
  }
  // Handle pending status
  else if (data.status === 'pending') {
    client.log(['WebSocket received pending status'], LogLevel.Verbose)
    handlePendingStatus(data, stepItems, setState, json, client)
  }
  // Handle submitted status
  else if (data.status === 'submitted') {
    client.log(['WebSocket received submitted status'], LogLevel.Verbose)
    handleSubmittedStatus(data, stepItems, setState, json, client)
  }
  // Handle failure status with delay (refund flow: pending -> failure -> pending -> refund)
  else if (data.status === 'failure') {
    handleFailureStatusWithDelay(
      stepItems,
      client,
      statusControl,
      onTerminalError
    )
  }
}

function isTerminalStatus(status: string): boolean {
  // Note: 'failure' is not immediately terminal due to the refund flow:
  // pending -> failure -> pending -> refund
  // 'pending' and 'submitted' are intermediate states before 'success'
  return ['success', 'refund'].includes(status)
}

function handlePendingStatus(
  data: RequestStatusUpdatedPayload,
  stepItems: Execute['steps'][0]['items'],
  setState: (data: SetStateData) => void,
  json: Execute,
  client: RelayClient
): void {
  // Update internalTxHashes if provided
  if (data.inTxHashes && data.inTxHashes.length > 0) {
    const internalTxHashes = data.inTxHashes.map((hash: string) => ({
      txHash: hash,
      chainId: data.originChainId ?? data.destinationChainId
    }))
    updateIncompleteItems(stepItems, (item) => {
      item.internalTxHashes = internalTxHashes
    })
  }

  // Mark step items as pending
  updateIncompleteItems(stepItems, (item) => {
    item.checkStatus = 'pending'
  })

  // Update state with pending status
  setState({
    steps: [...json.steps],
    fees: { ...json?.fees },
    breakdown: json?.breakdown,
    details: json?.details
  })

  client.log(
    ['WebSocket: Origin tx confirmed, backend processing', data],
    LogLevel.Verbose
  )
}

function handleSubmittedStatus(
  data: RequestStatusUpdatedPayload,
  stepItems: Execute['steps'][0]['items'],
  setState: (data: SetStateData) => void,
  json: Execute,
  client: RelayClient
): void {
  // Update txHashes if provided (partial updates during submitted state)
  if (data.txHashes && data.txHashes.length > 0) {
    const txHashes = data.txHashes.map((hash: string) => ({
      txHash: hash,
      chainId: data.destinationChainId ?? data.originChainId
    }))
    updateIncompleteItems(stepItems, (item) => {
      item.txHashes = txHashes
    })
  }

  // Update internalTxHashes if provided
  if (data.inTxHashes && data.inTxHashes.length > 0) {
    const internalTxHashes = data.inTxHashes.map((hash: string) => ({
      txHash: hash,
      chainId: data.originChainId ?? data.destinationChainId
    }))
    updateIncompleteItems(stepItems, (item) => {
      item.internalTxHashes = internalTxHashes
    })
  }

  // Mark step items as submitted (intermediate state, not complete)
  updateIncompleteItems(stepItems, (item) => {
    item.checkStatus = 'submitted'
  })

  // Update state with submitted status
  setState({
    steps: [...json.steps],
    fees: { ...json?.fees },
    breakdown: json?.breakdown,
    details: json?.details
  })

  client.log(
    ['WebSocket: Step submitted to relay, waiting for completion', data],
    LogLevel.Verbose
  )
}

function handleSuccessStatus(
  data: RequestStatusUpdatedPayload,
  stepItems: Execute['steps'][0]['items'],
  chainId: number,
  setState: (data: SetStateData) => void,
  json: Execute,
  client: RelayClient
): void {
  // Update txHashes if provided
  if (data.txHashes && data.txHashes.length > 0) {
    const txHashes = data.txHashes.map((hash: string) => ({
      txHash: hash,
      chainId: data.destinationChainId ?? chainId
    }))
    updateIncompleteItems(stepItems, (item) => {
      item.txHashes = txHashes
    })
  }

  // Update internalTxHashes if provided
  if (data.inTxHashes && data.inTxHashes.length > 0) {
    const internalTxHashes = data.inTxHashes.map((hash: string) => ({
      txHash: hash,
      chainId: data.originChainId ?? chainId
    }))
    updateIncompleteItems(stepItems, (item) => {
      item.internalTxHashes = internalTxHashes
    })
  }

  // Mark step items as complete
  updateIncompleteItems(stepItems, (item) => {
    item.status = 'complete'
    item.progressState = 'complete'
    item.checkStatus = 'success'
  })

  // Update state with completed steps
  setState({
    steps: [...json.steps],
    fees: { ...json?.fees },
    breakdown: json?.breakdown,
    details: json?.details
  })

  client.log(['WebSocket: Step completed successfully', data], LogLevel.Verbose)
}

function handleFailureStatus(
  client: RelayClient,
  stepItems: Execute['steps'][0]['items'],
  onTerminalError?: (error: Error) => void
): void {
  client.log(['WebSocket: transaction failed'], LogLevel.Error)
  updateIncompleteItems(stepItems, (item) => {
    item.checkStatus = 'failure'
  })

  const error = new Error('Transaction failed')
  onTerminalError?.(error)
}

function handleRefundStatus(
  client: RelayClient,
  stepItems: Execute['steps'][0]['items'],
  onTerminalError?: (error: Error) => void
): void {
  client.log(['WebSocket: transaction refunded'], LogLevel.Verbose)
  updateIncompleteItems(stepItems, (item) => {
    item.checkStatus = 'refund'
  })
  const error = new Error('Transaction failed: Refunded')
  onTerminalError?.(error)
}

function handleFailureStatusWithDelay(
  stepItems: Execute['steps'][0]['items'],
  client: RelayClient,
  statusControl: {
    closeWebSocket?: () => void
    lastKnownStatus?: string
    websocketFailureTimeoutId?: ReturnType<typeof setTimeout> | null
  },
  onTerminalError?: (error: Error) => void
): void {
  // Clear any existing failure timeout to handle multiple failure statuses
  clearFailureTimeout(statusControl, client, 'new failure status received')

  client.log(
    [
      'WebSocket received failure status, waiting 2 seconds for potential status change'
    ],
    LogLevel.Verbose
  )

  // Set a 2-second timeout to handle the case where failure is truly terminal
  statusControl.websocketFailureTimeoutId = setTimeout(() => {
    // Only proceed with failure handling if timeout still exists and status is still failure
    if (
      statusControl.websocketFailureTimeoutId &&
      statusControl.lastKnownStatus === 'failure'
    ) {
      client.log(
        ['WebSocket: 2-second timeout expired, treating failure as terminal'],
        LogLevel.Error
      )

      // Clear the timeout state
      statusControl.websocketFailureTimeoutId = null

      // Handle as terminal failure
      handleFailureStatus(client, stepItems, onTerminalError)
    } else {
      client.log(
        ['WebSocket: Failure timeout cancelled due to status change'],
        LogLevel.Verbose
      )
    }
  }, 2000) // 2 seconds
}

function updateIncompleteItems(
  stepItems: Execute['steps'][0]['items'],
  updateFn: (item: any) => void
): void {
  stepItems.forEach((item) => {
    if (item.status === 'incomplete') {
      updateFn(item)
    }
  })
}

function clearFailureTimeout(
  statusControl: {
    websocketFailureTimeoutId?: ReturnType<typeof setTimeout> | null
  },
  client: RelayClient,
  reason: string
): void {
  if (statusControl.websocketFailureTimeoutId) {
    clearTimeout(statusControl.websocketFailureTimeoutId)
    statusControl.websocketFailureTimeoutId = null
    client.log([`Cleared failure timeout: ${reason}`], LogLevel.Verbose)
  }
}
