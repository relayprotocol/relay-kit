import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useState,
  useCallback,
  useMemo
} from 'react'
import type { RelayKitTheme } from '@relayprotocol/relay-kit-ui'

// Client-side default routes through the demo's Relay proxy so authenticated
// endpoints (e.g. /requests/v3) get the x-api-key. See pages/api/relay/[...path].
// Absolute on the client because most SDK fetchers parse `new URL(baseApiUrl +
// path)` without an origin base.
const DEFAULT_RELAY_PROXY_PATH = '/api/relay/mainnets'
const getDefaultRelayProxy = () =>
  typeof window !== 'undefined'
    ? `${window.location.origin}${DEFAULT_RELAY_PROXY_PATH}`
    : DEFAULT_RELAY_PROXY_PATH

type CustomizeState = {
  themeOverrides: Partial<RelayKitTheme>
  setThemeOverrides: (overrides: Partial<RelayKitTheme>) => void
  updateThemeValue: (path: string, value: string | undefined) => void
  relayApi: string
  setRelayApi: (api: string) => void
  websocketsEnabled: boolean
  setWebsocketsEnabled: (enabled: boolean) => void
}

const CustomizeContext = createContext<CustomizeState>({
  themeOverrides: {},
  setThemeOverrides: () => {},
  updateThemeValue: () => {},
  relayApi: DEFAULT_RELAY_PROXY_PATH,
  setRelayApi: () => {},
  websocketsEnabled: false,
  setWebsocketsEnabled: () => {}
})

export const useCustomize = () => useContext(CustomizeContext)

export const CustomizeProvider: FC<{ children: ReactNode }> = ({
  children
}) => {
  const [themeOverrides, setThemeOverrides] = useState<Partial<RelayKitTheme>>({
    buttons: {
      cta: {
        fontStyle: 'italic'
      }
    }
  })
  const [relayApi, setRelayApi] = useState(getDefaultRelayProxy)
  const [websocketsEnabled, setWebsocketsEnabled] = useState(false)

  const updateThemeValue = useCallback(
    (path: string, value: string | undefined) => {
      setThemeOverrides((prev) => {
        const next = { ...prev }
        const keys = path.split('.')
        let obj: any = next
        for (let i = 0; i < keys.length - 1; i++) {
          if (!obj[keys[i]]) obj[keys[i]] = {}
          else obj[keys[i]] = { ...obj[keys[i]] }
          obj = obj[keys[i]]
        }
        const lastKey = keys[keys.length - 1]
        if (value === undefined || value === '') {
          delete obj[lastKey]
        } else {
          obj[lastKey] = value
        }
        return next
      })
    },
    []
  )

  const value = useMemo(
    () => ({
      themeOverrides,
      setThemeOverrides,
      updateThemeValue,
      relayApi,
      setRelayApi,
      websocketsEnabled,
      setWebsocketsEnabled
    }),
    [themeOverrides, updateThemeValue, relayApi, websocketsEnabled]
  )

  return (
    <CustomizeContext.Provider value={value}>
      {children}
    </CustomizeContext.Provider>
  )
}
