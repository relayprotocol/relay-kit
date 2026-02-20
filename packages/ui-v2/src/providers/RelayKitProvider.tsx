import { createContext, useMemo } from 'react'
import type { FC, ReactNode } from 'react'
import { RelayClientProvider } from './RelayClientProvider.js'
import type { RelayClientOptions, paths } from '@relayprotocol/relay-sdk'

/** App fee type from the relay SDK's quote API */
export type AppFees =
  paths['/quote/v2']['post']['requestBody']['content']['application/json']['appFees']

/**
 * Configuration options specific to the relay-kit-ui-v2 provider.
 * These are distinct from the relay SDK's RelayClientOptions.
 */
export type RelayKitProviderOptions = {
  /** Your app's display name (used in analytics) */
  appName?: string
  /** Optional app fees to collect on swaps */
  appFees?: AppFees
  /** Dune API configuration for non-EVM balance fetching */
  duneConfig?: {
    apiBaseUrl?: string
    apiKey?: string
  }
  /**
   * Maps VM types or chain IDs to wallet connector keys.
   * Used to disambiguate which wallet handles which chain.
   * Only needed for Eclipse/Solana multi-wallet scenarios.
   */
  vmConnectorKeyOverrides?: {
    [key in number | 'evm' | 'svm' | 'bvm']?: string[]
  }
  /** Chain IDs to include even if they are private/unlisted */
  privateChainIds?: string[]
  /**
   * Icon variant for chain icons. Defaults to 'light'.
   * Pass 'dark' when rendering on a dark background.
   */
  themeScheme?: 'dark' | 'light'
  /**
   * A secure proxy URL for quote requests.
   * Use this to hide your API key in production.
   */
  secureBaseUrl?: string
}

export interface RelayKitProviderProps {
  children: ReactNode
  options: RelayClientOptions & RelayKitProviderOptions
}

/**
 * React context for accessing relay-kit-ui-v2 provider options
 * (app fees, connector overrides, etc.) from any component in the tree.
 */
export const ProviderOptionsContext = createContext<RelayKitProviderOptions>({})

/**
 * Top-level provider for the relay-kit-ui-v2 package.
 *
 * Wrap your app (or just the widget area) with this provider:
 * ```tsx
 * <RelayKitProvider options={{ baseApiUrl: 'https://api.relay.link' }}>
 *   <SwapWidget ... />
 * </RelayKitProvider>
 * ```
 *
 * Unlike v1, this provider does NOT inject CSS variables or apply any theming.
 * Styling is handled entirely via Tailwind + the host app's CSS custom properties.
 */
export const RelayKitProvider: FC<RelayKitProviderProps> = ({
  children,
  options
}) => {
  const providerOptions = useMemo<RelayKitProviderOptions>(
    () => ({
      appName: options.appName,
      appFees: options.appFees,
      duneConfig: options.duneConfig,
      vmConnectorKeyOverrides: options.vmConnectorKeyOverrides,
      privateChainIds: options.privateChainIds,
      themeScheme: options.themeScheme,
      secureBaseUrl: options.secureBaseUrl
    }),
    [options]
  )

  return (
    <ProviderOptionsContext.Provider value={providerOptions}>
      <RelayClientProvider options={options}>{children}</RelayClientProvider>
    </ProviderOptionsContext.Provider>
  )
}
