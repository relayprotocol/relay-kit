import type { Execute } from '../types/Execute.js'
import { MAINNET_RELAY_WS } from '../constants/servers.js'

export interface RequestStatusUpdatedPayload {
  status: string
  inTxHashes?: string[]
  txHashes?: string[]
  updatedAt: number
  originChainId?: number
  destinationChainId?: number
}

export type WebSocketEventPayloads = {
  'request.status.updated': RequestStatusUpdatedPayload
}

export type WebSocketEvent = keyof WebSocketEventPayloads

export interface TrackRequestStatusOptions<E extends WebSocketEvent> {
  event: E
  requestId: string
  onOpen?: () => void
  onUpdate: (data: WebSocketEventPayloads[E]) => void
  onError?: (err: any) => void
  onClose?: () => void
  isTestnet?: boolean
  enabled?: boolean
}

// @TODO: remove once requestId gets added to top level of quote response
export function extractDepositRequestId(steps?: Execute['steps'] | null) {
  if (!steps?.length) return null

  // Find the first step that has a requestId
  return steps.find((step) => step.requestId)?.requestId || null
}

export function trackRequestStatus<E extends WebSocketEvent>({
  event,
  requestId,
  onOpen,
  onUpdate,
  onError,
  onClose,
  url,
  enabled = false
}: TrackRequestStatusOptions<E> & { url?: string }) {
  if (
    !enabled ||
    typeof window === 'undefined' ||
    typeof window.WebSocket === 'undefined'
  ) {
    return { close: () => {} }
  }

  const socketUrl = url || MAINNET_RELAY_WS
  const socket = new WebSocket(socketUrl)

  // Set up a connection timeout
  const connectionTimeout = setTimeout(() => {
    if (socket.readyState === WebSocket.CONNECTING) {
      socket.close()
      onError?.(new Error('WebSocket connection timeout'))
    }
  }, 2000) // 2 second timeout

  socket.onopen = () => {
    clearTimeout(connectionTimeout)
    if (onOpen) onOpen()
    socket.send(
      JSON.stringify({
        type: 'subscribe',
        event,
        filters: { id: requestId }
      })
    )
  }

  socket.onmessage = async (eventMsg) => {
    try {
      // Handle both string and Blob data
      let data: string
      if (eventMsg.data instanceof Blob) {
        data = await eventMsg.data.text()
      } else {
        data = eventMsg.data
      }

      const msg = JSON.parse(data)

      // Handle different message types
      if (msg.type === 'connection') {
        // Connection established
      } else if (msg.type === 'subscribe') {
        // Subscription confirmed
      } else if (msg.event === event && msg.data) {
        onUpdate(msg.data)
      } else if (msg.data?.event === event && msg.data?.data) {
        onUpdate(msg.data.data)
      }
    } catch (err) {
      onError?.(err)
    }
  }

  socket.onerror = (err) => {
    clearTimeout(connectionTimeout)
    onError?.(err)
  }

  socket.onclose = () => {
    clearTimeout(connectionTimeout)
    onClose?.()
  }

  return {
    close: () => {
      clearTimeout(connectionTimeout)
      socket.close()
    }
  }
}
