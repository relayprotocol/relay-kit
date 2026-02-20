import { useContext } from 'react'
import { RelayClientContext } from '@/providers/RelayClientProvider.js'
import type { RelayClient } from '@relayprotocol/relay-sdk'

/**
 * Returns the initialized RelayClient from context.
 * Returns null if called outside of a RelayClientProvider.
 *
 * @example
 * const relayClient = useRelayClient()
 * const chains = relayClient?.chains ?? []
 */
export function useRelayClient(): RelayClient | null {
  return useContext(RelayClientContext)
}
