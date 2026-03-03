import {
  LogLevel,
  MAINNET_RELAY_WS,
  RelayChain
} from '@relayprotocol/relay-sdk'
import { RelayKitProvider } from '@relayprotocol/relay-kit-ui'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/router'
import { FC, ReactNode, useMemo } from 'react'
import { useCustomize } from 'context/customizeContext'

const DEFAULT_APP_FEES = [
  {
    fee: '1000',
    recipient: '0x03508bB71268BBA25ECaCC8F620e01866650532c'
  }
]

const BASE_THEME = {
  font: 'var(--font-inter), -apple-system, Helvetica, sans-serif',
  fontHeading: 'Chivo, -apple-system, Helvetica, sans-serif'
}

export const RelayKitProviderWrapper: FC<{
  relayApi?: string
  dynamicChains: RelayChain[]
  children: ReactNode
}> = ({ relayApi, dynamicChains, children }) => {
  const { theme } = useTheme()
  const router = useRouter()
  const { themeOverrides, websocketsEnabled } = useCustomize()
  const appFeesEnabled = router.query.appFees === 'true'

  const mergedTheme = useMemo(
    () => ({
      ...BASE_THEME,
      ...themeOverrides
    }),
    [themeOverrides]
  )

  return (
    <RelayKitProvider
      options={{
        baseApiUrl: relayApi,
        source: 'relay-demo',
        logLevel: LogLevel.Verbose,
        duneConfig: {
          apiBaseUrl: process.env.NEXT_PUBLIC_DUNE_API_URL,
          apiKey: process.env.NEXT_PUBLIC_DUNE_API_KEY
        },
        chains: dynamicChains,
        privateChainIds: process.env.NEXT_PUBLIC_INCLUDE_CHAINS?.split(','),
        appName: 'Relay Demo',
        useGasFeeEstimations: true,
        pollingInterval: 1000,
        confirmationPollingInterval: 1000,
        themeScheme: theme === 'dark' ? 'dark' : 'light',
        websocket: {
          enabled: websocketsEnabled,
          url: MAINNET_RELAY_WS
        },
        secureBaseUrl: process.env.NEXT_PUBLIC_RELAY_SECURE_API_URL,
        appFees: appFeesEnabled ? DEFAULT_APP_FEES : undefined,
        logger: (message, level) => {
          window.dispatchEvent(
            new CustomEvent('relay-kit-logger', {
              detail: {
                message,
                level
              }
            })
          )
          console.log('message', message, level)
        }
      }}
      theme={mergedTheme}
    >
      {children}
    </RelayKitProvider>
  )
}
