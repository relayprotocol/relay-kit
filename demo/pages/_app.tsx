import '@relayprotocol/relay-kit-ui/styles.css'
import '../fonts.css'
import '../global.css'

import type { AppProps, AppContext } from 'next/app'
import React, { ReactNode, FC, useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { Chain, mainnet, optimism, base, zora } from 'wagmi/chains'
import {
  convertViemChainToRelayChain,
  MAINNET_RELAY_API,
  TESTNET_RELAY_API,
  configureViemChain,
  type RelayChain
} from '@relayprotocol/relay-sdk'
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
import { AbstractEvmWalletConnectors } from '@dynamic-labs-connectors/abstract-global-wallet-evm'
import { MoonPayProvider } from 'context/MoonpayProvider'
import { queryRelayChains } from '@relayprotocol/relay-kit-hooks'
import { RelayKitProviderWrapper } from 'components/providers/RelayKitProviderWrapper'
import { Barlow, Chivo } from 'next/font/google'

export const chivo = Chivo({
  weight: ['700', '800'],
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

type AppWrapperProps = {
  children: ReactNode
  dynamicChains: RelayChain[]
}

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''

const queryClient = new QueryClient()

const AppWrapper: FC<AppWrapperProps> = ({ children, dynamicChains }) => {
  const { walletFilter, setWalletFilter } = useWalletFilter()
  const router = useRouter()
  const [relayApi, setRelayApi] = useState(MAINNET_RELAY_API)

  useEffect(() => {
    const isTestnet = router.query.api === 'testnets'
    const newApi = isTestnet ? TESTNET_RELAY_API : MAINNET_RELAY_API
    if (relayApi !== newApi) {
      setRelayApi(isTestnet ? TESTNET_RELAY_API : MAINNET_RELAY_API)
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
          transportsConfig[chain.id] = http()
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
        }
      `

      document.body.appendChild(styleElement)
    }
  }, [])

  return (
    <div>
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
                AbstractEvmWalletConnectors
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
      <QueryClientProvider client={queryClient}>
        <AppWrapper dynamicChains={pageProps.dynamicChains}>
          <Component {...pageProps} />
        </AppWrapper>
      </QueryClientProvider>
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

    const isTestnet = ctx.query.api === 'testnets'
    const baseApiUrl = isTestnet ? TESTNET_RELAY_API : MAINNET_RELAY_API

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
