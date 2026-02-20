import { createContext, useState } from 'react'
import type { FC, ReactNode } from 'react'
import { createClient } from '@relayprotocol/relay-sdk'
import type { RelayClientOptions, RelayClient } from '@relayprotocol/relay-sdk'

export interface RelayClientProviderProps {
  children: ReactNode
  options: RelayClientOptions
}

/**
 * React context that holds the initialized RelayClient instance.
 * Access it via `useRelayClient()` — do not consume this context directly.
 */
export const RelayClientContext = createContext<RelayClient | null>(null)

/**
 * Initializes and provides the Relay SDK client to the component tree.
 * The client is created once and never recreated (memoized in useState).
 */
export const RelayClientProvider: FC<RelayClientProviderProps> = ({
  children,
  options
}) => {
  // Use useState instead of useMemo so the client is never recreated on re-renders
  const [clientContext] = useState<RelayClient | null>(() =>
    createClient({ ...options })
  )

  return (
    <RelayClientContext.Provider value={clientContext}>
      {children}
    </RelayClientContext.Provider>
  )
}
