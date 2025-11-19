import type { NextPage, GetServerSideProps } from 'next'
import { TokenWidget } from '@relayprotocol/relay-kit-ui/TokenWidget'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { Layout } from 'components/Layout'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/router'
import {
  useDynamicContext,
  useDynamicEvents,
  useDynamicModals,
  useSwitchWallet,
  useUserWallets,
  type Wallet
} from '@dynamic-labs/sdk-react-core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { isSolanaWallet } from '@dynamic-labs/solana'
import { adaptSolanaWallet } from '@relayprotocol/relay-svm-wallet-adapter'
import {
  adaptViemWallet,
  ASSETS_RELAY_API,
  type AdaptedWallet,
  type ChainVM
} from '@relayprotocol/relay-sdk'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import { useWalletFilter } from 'context/walletFilter'
import { adaptBitcoinWallet } from '@relayprotocol/relay-bitcoin-wallet-adapter'
import { isBitcoinWallet } from '@dynamic-labs/bitcoin'
import { convertToLinkedWallet } from 'utils/dynamic'
import { isEclipseWallet } from '@dynamic-labs/eclipse'
import type { LinkedWallet, Token } from '@relayprotocol/relay-kit-ui'
import { isSuiWallet, type SuiWallet } from '@dynamic-labs/sui'
import { adaptSuiWallet } from '@relayprotocol/relay-sui-wallet-adapter'
import { useTokenList } from '@relayprotocol/relay-kit-hooks'
import Head from 'next/head'

const WALLET_VM_TYPES: Exclude<ChainVM, 'hypevm'>[] = [
  'evm',
  'bvm',
  'svm',
  'suivm',
  'tvm'
]

const TokenWidgetPage: NextPage = () => {
  const router = useRouter()
  const relayClient = useRelayClient()
  useDynamicEvents('walletAdded', (newWallet) => {
    if (linkWalletPromise) {
      linkWalletPromise?.resolve(convertToLinkedWallet(newWallet))
      setLinkWalletPromise(undefined)
    }
  })

  const [fromToken, setFromToken] = useState<Token | undefined>()
  const [toToken, setToToken] = useState<Token | undefined>()

  const [hasInitialized, setHasInitialized] = useState(false)

  const { setWalletFilter } = useWalletFilter()
  const { setShowAuthFlow, primaryWallet } = useDynamicContext()
  const { theme } = useTheme()
  const [singleChainMode, setSingleChainMode] = useState(false)
  const [supportedWalletVMs, setSupportedWalletVMs] = useState<
    Exclude<ChainVM, 'hypevm'>[]
  >([...WALLET_VM_TYPES])
  const _switchWallet = useSwitchWallet()
  const { setShowLinkNewWalletModal } = useDynamicModals()
  const userWallets = useUserWallets()
  const wallets = useRef<Wallet<any>[]>([])
  const switchWallet =
    useRef<(walletId: string) => Promise<void> | undefined>(undefined)
  const [wallet, setWallet] = useState<AdaptedWallet | undefined>()
  const [linkWalletPromise, setLinkWalletPromise] = useState<
    | {
        resolve: (value: LinkedWallet) => void
        reject: () => void
        params: { chain?: RelayChain; direction: 'to' | 'from' }
      }
    | undefined
  >()

  // Parse URL params for token
  const [urlTokenAddress, setUrlTokenAddress] = useState<string | undefined>()
  const [urlTokenChainId, setUrlTokenChainId] = useState<number | undefined>()

  const [tokenNotFound, setTokenNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')

  const queryEnabled = !!(urlTokenAddress && urlTokenChainId && relayClient)

  const isChainSupported = relayClient?.chains?.some(
    (chain) => chain.id === urlTokenChainId
  )

  const { data: tokenListFromUrl } = useTokenList(
    relayClient?.baseApiUrl,
    urlTokenAddress && urlTokenChainId && isChainSupported
      ? {
          chainIds: [urlTokenChainId],
          address: urlTokenAddress,
          limit: 1,
          referrer: relayClient?.source
        }
      : undefined,
    {
      enabled: queryEnabled && isChainSupported,
      retry: 1,
      retryDelay: 1000,
      staleTime: 0
    }
  )

  const { data: externalTokenListFromUrl } = useTokenList(
    relayClient?.baseApiUrl,
    urlTokenAddress && urlTokenChainId && isChainSupported
      ? {
          chainIds: [urlTokenChainId],
          address: urlTokenAddress,
          limit: 1,
          useExternalSearch: true,
          referrer: relayClient?.source
        }
      : undefined,
    {
      enabled: queryEnabled && isChainSupported,
      retry: 1,
      retryDelay: 1000,
      staleTime: 0
    }
  )

  // Resolve URL params to Token object
  const urlToken = useMemo(() => {
    const apiToken = tokenListFromUrl?.[0] || externalTokenListFromUrl?.[0]

    if (!apiToken && urlTokenAddress && urlTokenChainId) {
      const isTargetUSDC =
        urlTokenAddress.toLowerCase() ===
          '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'.toLowerCase() &&
        urlTokenChainId === 8453

      if (isTargetUSDC) {
        return {
          chainId: 8453,
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          logoURI: `${ASSETS_RELAY_API}/icons/currencies/usdc.png`,
          verified: true
        } as Token
      }

      return undefined
    }

    if (!apiToken) {
      return undefined
    }

    return {
      chainId: apiToken.chainId!,
      address: apiToken.address!,
      name: apiToken.name!,
      symbol: apiToken.symbol!,
      decimals: apiToken.decimals!,
      logoURI: apiToken.metadata?.logoURI ?? '',
      verified: apiToken.metadata?.verified ?? false
    } as Token
  }, [
    tokenListFromUrl,
    externalTokenListFromUrl,
    urlTokenAddress,
    urlTokenChainId
  ])

  const linkedWallets = useMemo(() => {
    const _wallets = userWallets.reduce((linkedWallets, wallet) => {
      linkedWallets.push(convertToLinkedWallet(wallet))
      return linkedWallets
    }, [] as LinkedWallet[])
    wallets.current = userWallets
    return _wallets
  }, [userWallets])

  useEffect(() => {
    if (!router.isReady) {
      return
    }

    const params = router.query.params
    const [addressParam, chainParam] = Array.isArray(params) ? params : []

    if (!addressParam || !chainParam) {
      setUrlTokenAddress(undefined)
      setUrlTokenChainId(undefined)
      return
    }

    const rawAddress = Array.isArray(addressParam)
      ? addressParam[0]
      : addressParam
    const rawChain = Array.isArray(chainParam) ? chainParam[0] : chainParam

    const decodedAddress = decodeURIComponent(rawAddress)
    const chainId = Number(rawChain)

    if (!Number.isNaN(chainId)) {
      setUrlTokenAddress(decodedAddress)
      setUrlTokenChainId(chainId)
      setTokenNotFound(false)
    }
  }, [router.isReady, router.query.params])

  const updateDemoUrlWithRawParams = useCallback(
    (address: string, chainId: number) => {
      if (!router.isReady) {
        return
      }

      const encodedAddress = encodeURIComponent(address)
      const chainParam = chainId.toString()
      const nextPath = `/ui/token/${encodedAddress}/${chainParam}`

      router.replace(
        {
          pathname: '/ui/token/[[...params]]',
          query: { params: [address, chainParam] }
        },
        nextPath,
        { shallow: true }
      )
    },
    [router]
  )

  const handleAnalyticEvent = useCallback((eventName: string, data?: any) => {
    console.log('Analytic Event', eventName, data)
  }, [])

  useEffect(() => {
    switchWallet.current = _switchWallet
  }, [_switchWallet])

  useEffect(() => {
    if (!hasInitialized && router.isReady && relayClient) {
      const params = router.query.params
      const hasParams = Array.isArray(params) && params.length >= 2

      if (!hasParams) {
        const targetAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
        const targetChainId = 8453

        setUrlTokenAddress(targetAddress)
        setUrlTokenChainId(targetChainId)
        updateDemoUrlWithRawParams(targetAddress, targetChainId)
      }

      setHasInitialized(true)
    }
  }, [
    hasInitialized,
    router.isReady,
    relayClient,
    router.query.params,
    updateDemoUrlWithRawParams
  ])

  useEffect(() => {
    if (urlTokenAddress && urlTokenChainId && !urlToken && relayClient) {
      const timer = setTimeout(() => {
        if (!urlToken) {
          setTokenNotFound(true)
        }
      }, 2000)

      return () => clearTimeout(timer)
    } else if (urlToken) {
      setTokenNotFound(false)
    }
  }, [urlTokenAddress, urlTokenChainId, urlToken, relayClient])

  useEffect(() => {
    const adaptWallet = async () => {
      try {
        if (primaryWallet !== null) {
          let adaptedWallet: AdaptedWallet | undefined
          if (isEthereumWallet(primaryWallet)) {
            const walletClient = await primaryWallet.getWalletClient()
            adaptedWallet = adaptViemWallet(walletClient)
          } else if (isBitcoinWallet(primaryWallet)) {
            const wallet = convertToLinkedWallet(primaryWallet)
            const publicKey = primaryWallet.additionalAddresses.find(
              ({ address, type }) =>
                address === wallet.address && type === 'payment'
            )?.publicKey
            adaptedWallet = adaptBitcoinWallet(
              wallet.address,
              async (_address, _psbt, dynamicParams) => {
                try {
                  // Request the wallet to sign the PSBT
                  const response = await primaryWallet.signPsbt(dynamicParams)

                  if (!response) {
                    throw 'Missing psbt response'
                  }
                  return response.signedPsbt
                } catch (e) {
                  throw e
                }
              },
              publicKey
            )
          } else if (
            isSolanaWallet(primaryWallet) ||
            isEclipseWallet(primaryWallet)
          ) {
            const connection = await (primaryWallet as any).getConnection()
            const signer = await (primaryWallet as any).getSigner()
            const _chainId = isEclipseWallet(primaryWallet)
              ? 9286185
              : 792703809
            adaptedWallet = adaptSolanaWallet(
              primaryWallet.address,
              _chainId,
              connection,
              signer.signAndSendTransaction
            )
          } else if (isSuiWallet(primaryWallet)) {
            const suiWallet = primaryWallet as SuiWallet
            const walletClient = await suiWallet.getWalletClient()

            if (!walletClient) {
              throw 'Unable to setup Sui wallet'
            }

            adaptedWallet = adaptSuiWallet(
              suiWallet.address,
              103665049, // @TODO: handle sui testnet
              walletClient as any,
              async (tx) => {
                const signedTransaction = await suiWallet.signTransaction(tx)

                const executionResult =
                  await walletClient.executeTransactionBlock({
                    options: {},
                    signature: signedTransaction.signature,
                    transactionBlock: signedTransaction.bytes
                  })

                return executionResult
              }
            )
          }

          setWallet(adaptedWallet)
        } else {
          setWallet(undefined)
        }
      } catch (e) {
        setWallet(undefined)
      }
    }
    adaptWallet()
  }, [primaryWallet, primaryWallet?.address])

  return (
    <Layout
      styles={{
        background: theme === 'light' ? 'white' : '#111113'
      }}
    >
      <Head>
        <title>Token Widget</title>
        <meta name="description" content="Token Widget" />
      </Head>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 50,
          paddingInline: '10px',
          gap: 20
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 12,
              padding: '12px 16px',
              background:
                theme === 'light'
                  ? 'rgba(255, 255, 255, 0.8)'
                  : 'rgba(28, 23, 43, 0.8)',
              borderRadius: 16,
              border: `1px solid ${
                theme === 'light'
                  ? 'rgba(148, 163, 184, 0.2)'
                  : 'rgba(148, 163, 184, 0.1)'
              }`
            }}
          >
            <button
              onClick={() => setActiveTab('buy')}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: 'none',
                background: activeTab === 'buy' ? '#4f46e5' : '#94a3b8',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: activeTab === 'buy' ? 1 : 0.6
              }}
            >
              Open Buy Tab
            </button>
            <button
              onClick={() => setActiveTab('sell')}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: 'none',
                background: activeTab === 'sell' ? '#4f46e5' : '#94a3b8',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: activeTab === 'sell' ? 1 : 0.6
              }}
            >
              Open Sell Tab
            </button>
          </div>
          <TokenWidget
            key={`swap-widget-${singleChainMode ? 'single' : 'multi'}-chain`}
            lockChainId={singleChainMode ? 8453 : undefined}
            singleChainMode={singleChainMode}
            supportedWalletVMs={supportedWalletVMs}
            toToken={urlToken || toToken}
            setToToken={setToToken}
            fromToken={fromToken}
            setFromToken={setFromToken}
            lockToToken={!!urlToken}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            wallet={wallet}
            multiWalletSupportEnabled={true}
            linkedWallets={linkedWallets}
            onLinkNewWallet={({ chain, direction }) => {
              if (linkWalletPromise) {
                linkWalletPromise.reject()
                setLinkWalletPromise(undefined)
              }
              if (chain?.vmType === 'evm') {
                setWalletFilter('EVM')
              } else if (chain?.id === 792703809) {
                setWalletFilter('SOL')
              } else if (chain?.id === 8253038) {
                setWalletFilter('BTC')
              } else if (chain?.id === 9286185) {
                setWalletFilter('ECLIPSE')
              } else if (chain?.vmType === 'suivm') {
                setWalletFilter('SUI')
              } else if (chain?.vmType === 'tvm') {
                setWalletFilter('TRON')
              } else {
                setWalletFilter(undefined)
              }
              const promise = new Promise<LinkedWallet>((resolve, reject) => {
                setLinkWalletPromise({
                  resolve,
                  reject,
                  params: {
                    chain,
                    direction
                  }
                })
              })
              setShowLinkNewWalletModal(true)
              return promise
            }}
            onSetPrimaryWallet={async (address: string) => {
              //In some cases there's a race condition between connecting the wallet and having it available to switch to so we need to poll for it
              const maxAttempts = 20
              let attemptCount = 0
              const timer = setInterval(async () => {
                attemptCount++
                const newPrimaryWallet = wallets.current?.find(
                  (wallet) =>
                    wallet.address === address ||
                    wallet.additionalAddresses.find(
                      (_address) => _address.address === address
                    )
                )
                if (attemptCount >= maxAttempts) {
                  clearInterval(timer)
                  return
                }
                if (!newPrimaryWallet || !switchWallet.current) {
                  return
                }
                try {
                  await switchWallet.current(newPrimaryWallet?.id)
                  clearInterval(timer)
                } catch (e) {}
              }, 200)
            }}
            onConnectWallet={() => {
              setShowAuthFlow(true)
            }}
            onAnalyticEvent={handleAnalyticEvent}
            onFromTokenChange={(token) => {
              setFromToken(token)
              if (token) {
                setTokenNotFound(false)
              }
            }}
            onToTokenChange={(token) => {
              setToToken(token)
              if (token) {
                setTokenNotFound(false)
              }
            }}
            onSwapError={(e, data) => {
              console.log('onSwapError Triggered', e, data)
            }}
            onSwapSuccess={(data) => {
              console.log('onSwapSuccess Triggered', data)
            }}
            onUnverifiedTokenDecline={(
              token: Token,
              context: 'from' | 'to'
            ) => {
              console.log('User declined unverified token:', {
                symbol: token.symbol,
                address: token.address,
                chainId: token.chainId,
                context: context
              })
              // Redirect to swap page
              router.push('/ui/swap')
            }}
            slippageTolerance={undefined}
            onOpenSlippageConfig={() => {
              // setSlippageToleranceConfigOpen(true)
            }}
          />
          {tokenNotFound ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                width: '100%',
                maxWidth: 400
              }}
            >
              <p
                style={{
                  margin: 0,
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: 'rgba(255, 231, 231, 0.6)',
                  color: '#9f1239',
                  fontSize: 14,
                  textAlign: 'center'
                }}
              >
                {!isChainSupported && urlTokenChainId
                  ? `Chain ${urlTokenChainId} is not supported by Relay. Please select a token from a supported chain.`
                  : 'Token from URL was not found on the specified chain. Please select a token manually to continue.'}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {
      ssr: true
    }
  }
}

export default TokenWidgetPage
