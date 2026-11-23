import {
  LogLevel,
  MAINNET_RELAY_WS,
  RelayChain
} from '@relayprotocol/relay-sdk'
import { RelayKitProvider } from '@relayprotocol/relay-kit-ui'
import type { HapticEventType } from '@relayprotocol/relay-kit-ui'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/router'
import { FC, ReactNode, useCallback, useEffect, useMemo } from 'react'
import { useCustomize } from 'context/customizeContext'
import { useWebHaptics } from 'web-haptics/react'

const APP_FEE_RECIPIENT = '0x03508bB71268BBA25ECaCC8F620e01866650532c'

const QUOTE_OVERRIDES_COOKIE = 'relay-demo-quote-overrides'

const readQueryString = (value: string | string[] | undefined) =>
  typeof value === 'string' && value.length > 0 ? value : undefined

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
  const appFeeBps = readQueryString(router.query.appFeeBps) ?? '1000'
  const sponsor = readQueryString(router.query.sponsor)
  const sponsorBps = readQueryString(router.query.sponsorBps)
  const sponsorMax = readQueryString(router.query.sponsorMax)

  useEffect(() => {
    if (!router.isReady) return
    document.cookie = sponsor
      ? `${QUOTE_OVERRIDES_COOKIE}=${encodeURIComponent(
          JSON.stringify({ sponsor, sponsorBps, sponsorMax })
        )}; path=/; SameSite=Lax`
      : `${QUOTE_OVERRIDES_COOKIE}=; path=/; max-age=0`
  }, [router.isReady, sponsor, sponsorBps, sponsorMax])
  const { trigger } = useWebHaptics({
    // enables audio feedback for testing on desktop
    // debug: true
  })

  // web-haptics presets match our HapticEventType names exactly
  const onHapticEvent = useCallback(
    (type: HapticEventType) => {
      console.log(`[haptic] ${type}`)
      trigger(type)
    },
    [trigger]
  )

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
        // Defaults to the demo's Codex proxy, which holds the key server-side
        codexConfig: {
          apiBaseUrl: process.env.NEXT_PUBLIC_CODEX_API_URL ?? '/api/codex'
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
        appFees: appFeesEnabled
          ? [{ fee: appFeeBps, recipient: APP_FEE_RECIPIENT }]
          : undefined,
        onHapticEvent,
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
