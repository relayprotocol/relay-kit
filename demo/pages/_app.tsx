import '@relayprotocol/relay-kit-ui/styles.css'
import '../fonts.css'
import '../global.css'

import type { AppProps, AppContext } from 'next/app'
import React, { ReactNode, FC, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { Chain, mainnet, optimism, base, zora } from 'wagmi/chains'
import {
  convertViemChainToRelayChain,
  MAINNET_RELAY_API,
  TESTNET_RELAY_API,
  type RelayChain
} from '@relayprotocol/relay-sdk'

const DEV_RELAY_API = 'https://api.dev.relay.link'

const resolveRelayApi = (api: unknown): string => {
  if (api === 'testnets') return TESTNET_RELAY_API
  if (api === 'mainnets-dev') return DEV_RELAY_API
  return MAINNET_RELAY_API
}
import { configureViemChain } from '@relayprotocol/relay-sdk/chain-utils'
import { ThemeProvider } from 'next-themes'
import { useRouter } from 'next/router'
import {
  FilterChain,
  DynamicContextProvider
} from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { SolanaWalletConnectors } from '@dynamic-labs/solana'
import { BitcoinWalletConnectors } from '@dynamic-labs/bitcoin'
import { SuiWalletConnectors } from '@dynamic-labs/sui'
import { convertRelayChainToDynamicNetwork } from 'utils/dynamic'
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector'
import { EIP1193RequestFn, fallback, Transport } from 'viem'
import { chainIdToAlchemyNetworkMap } from 'utils/chainIdToAlchemyNetworkMap'
import { useWalletFilter, WalletFilterProvider } from 'context/walletFilter'
import { EclipseWalletConnectors } from '@dynamic-labs/eclipse'
import { TronWalletConnectors } from '@dynamic-labs/tron'
import { AbstractEvmWalletConnectors } from '@dynamic-labs-connectors/abstract-global-wallet-evm'
import { MoonPayProvider } from 'context/MoonpayProvider'
import { CustomizeProvider, useCustomize } from 'context/customizeContext'
import { queryRelayChains } from '@relayprotocol/relay-kit-hooks'
import { RelayKitProviderWrapper } from 'components/providers/RelayKitProviderWrapper'
import { Barlow, Chivo, Inter } from 'next/font/google'
import { Porto } from 'porto'

Porto.create()

export const chivo = Chivo({
  weight: ['700', '800'],
  style: ['italic', 'normal'],
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-chivo'
})

export const barlow = Barlow({
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-barlow'
})

export const inter = Inter({
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-inter'
})

type AppWrapperProps = {
  children: ReactNode
  dynamicChains: RelayChain[]
}

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''

const queryClient = new QueryClient()

const AppWrapper: FC<AppWrapperProps> = ({ children, dynamicChains }) => {
  const { walletFilter, setWalletFilter } = useWalletFilter()
  const { relayApi, setRelayApi } = useCustomize()
  const router = useRouter()

  useEffect(() => {
    const newApi = resolveRelayApi(router.query.api)
    if (relayApi !== newApi) {
      setRelayApi(newApi)
    }
  }, [router.query.api])

  const viemChains = dynamicChains.map((chain) => chain.viemChain) as [
    Chain,
    ...Chain[]
  ]

  const wagmiConfig = createConfig({
    chains: viemChains,
    multiInjectedProviderDiscovery: false,
    ssr: true,
    transports: viemChains.reduce(
      (transportsConfig, chain) => {
        const network = chainIdToAlchemyNetworkMap[chain.id]
        if (network && ALCHEMY_API_KEY) {
          transportsConfig[chain.id] = fallback([
            http(`https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`),
            http()
          ])
        } else {
          const rpcUrl = chain.rpcUrls?.default?.http?.[0]
          if (rpcUrl) {
            try {
              const url = new URL(rpcUrl)
              if (url.username || url.password) {
                const credentials = btoa(`${url.username}:${url.password}`)
                url.username = ''
                url.password = ''
                transportsConfig[chain.id] = http(url.toString(), {
                  fetchOptions: {
                    headers: {
                      Authorization: `Basic ${credentials}`
                    }
                  }
                })
              } else {
                transportsConfig[chain.id] = http()
              }
            } catch {
              transportsConfig[chain.id] = http()
            }
          } else {
            transportsConfig[chain.id] = http()
          }
        }
        return transportsConfig
      },
      {} as Record<
        number,
        Transport<string, Record<string, any>, EIP1193RequestFn>
      >
    )
  })

  useEffect(() => {
    if (document) {
      const styleElement = document.createElement('style')

      styleElement.textContent = `
        :root {
          --font-chivo: ${chivo.style.fontFamily};
          --font-barlow: ${barlow.style.fontFamily};
          --font-inter: ${inter.style.fontFamily};
        }
      `

      document.body.appendChild(styleElement)
    }
  }, [])

  return (
    <div
      style={{
        fontFamily:
          'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
      }}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <RelayKitProviderWrapper
          relayApi={relayApi}
          dynamicChains={dynamicChains}
        >
          <DynamicContextProvider
            settings={{
              logLevel: 'INFO',
              environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID ?? '',
              walletConnectors: [
                EthereumWalletConnectors,
                SolanaWalletConnectors,
                BitcoinWalletConnectors,
                EclipseWalletConnectors,
                SuiWalletConnectors,
                AbstractEvmWalletConnectors,
                TronWalletConnectors
              ],
              cssOverrides: `
              [data-testid="send-balance-button"] {
                display: none;
              }
            `,
              walletsFilter: walletFilter
                ? FilterChain(walletFilter)
                : undefined,
              overrides: {
                evmNetworks: () => {
                  return (dynamicChains ?? [])
                    .filter((chain) => chain.vmType === 'evm')
                    .map((chain) => {
                      return convertRelayChainToDynamicNetwork(chain)
                    })
                }
              },
              initialAuthenticationMode: 'connect-only',
              events: {
                onAuthFlowClose: () => {
                  setWalletFilter(undefined)
                }
              }
            }}
          >
            <WagmiProvider config={wagmiConfig}>
              <MoonPayProvider>
                <DynamicWagmiConnector>{children}</DynamicWagmiConnector>
              </MoonPayProvider>
            </WagmiProvider>
          </DynamicContextProvider>
        </RelayKitProviderWrapper>
      </ThemeProvider>
    </div>
  )
}

type MyAppProps = AppProps & {
  dynamicChains: RelayChain[]
}

function MyApp({ Component, pageProps }: MyAppProps) {
  return (
    <WalletFilterProvider>
      <CustomizeProvider>
        <QueryClientProvider client={queryClient}>
          <AppWrapper dynamicChains={pageProps.dynamicChains}>
            <Component {...pageProps} />
          </AppWrapper>
        </QueryClientProvider>
      </CustomizeProvider>
    </WalletFilterProvider>
  )
}

const getInitialProps = async ({
  ctx
}: AppContext): Promise<{ pageProps: { dynamicChains: RelayChain[] } }> => {
  const backupChains = [mainnet, base, zora, optimism].map((chain) =>
    convertViemChainToRelayChain(chain)
  )

  try {
    // Skip fetching on client-side
    if (!ctx.res) {
      return {
        pageProps: {
          dynamicChains: backupChains
        }
      }
    }

    const baseApiUrl = resolveRelayApi(ctx.query.api)

    const url = new URL(`${baseApiUrl}/chains`)

    if (process.env.NEXT_PUBLIC_INCLUDE_CHAINS) {
      url.searchParams.set(
        'includeChains',
        process.env.NEXT_PUBLIC_INCLUDE_CHAINS
      )
    }

    const chainsResponse = await queryRelayChains(baseApiUrl, {
      includeChains: process.env.NEXT_PUBLIC_INCLUDE_CHAINS
    })

    if (!chainsResponse?.chains) {
      throw new Error(`Chains API failed to return chains`)
    }

    const relayChains = chainsResponse?.chains
      ?.filter((chain) => chain.id !== undefined)
      ?.map((chain) => {
        const network = chainIdToAlchemyNetworkMap[chain.id as number]
        if (network && ALCHEMY_API_KEY) {
          chain.httpRpcUrl = `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
        }
        return configureViemChain(chain as any)
      })

    // Set cache headers
    ctx.res.setHeader(
      'Cache-Control',
      'public, s-maxage=10, stale-while-revalidate=300'
    )

    return {
      pageProps: {
        dynamicChains: relayChains ?? backupChains
      }
    }
  } catch (e) {
    console.error('Falling back to backup chains:', e)
    return {
      pageProps: {
        dynamicChains: backupChains
      }
    }
  }
}

MyApp.getInitialProps = getInitialProps

export default MyApp
