import { NextPage, GetServerSideProps } from 'next'
import { TokenWidget, useRelayClient } from '@relayprotocol/relay-kit-ui'
import { Layout } from 'components/Layout'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/router'
import {
  useDynamicContext,
  useDynamicEvents,
  useDynamicModals,
  useSwitchWallet,
  useUserWallets,
  Wallet
} from '@dynamic-labs/sdk-react-core'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { isSolanaWallet } from '@dynamic-labs/solana'
import { adaptSolanaWallet } from '@relayprotocol/relay-svm-wallet-adapter'
import {
  AdaptedWallet,
  adaptViemWallet,
  ChainVM,
  ASSETS_RELAY_API,
  RelayChain
} from '@relayprotocol/relay-sdk'
import { useWalletFilter } from 'context/walletFilter'
import { adaptBitcoinWallet } from '@relayprotocol/relay-bitcoin-wallet-adapter'
import { isBitcoinWallet } from '@dynamic-labs/bitcoin'
import { convertToLinkedWallet } from 'utils/dynamic'
import { isEclipseWallet } from '@dynamic-labs/eclipse'
import type { LinkedWallet, Token } from '@relayprotocol/relay-kit-ui'
import { isSuiWallet, SuiWallet } from '@dynamic-labs/sui'
import { adaptSuiWallet } from '@relayprotocol/relay-sui-wallet-adapter'
import Head from 'next/head'

const WALLET_VM_TYPES = ['evm', 'bvm', 'svm', 'suivm'] as const
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

type ChainCurrency =
  | NonNullable<RelayChain['erc20Currencies']>[number]
  | RelayChain['currency']

const buildTokenFromCurrency = (
  currency: ChainCurrency | null | undefined,
  chainId: number
): Token | undefined => {
  if (!currency) {
    return undefined
  }

  return {
    chainId,
    address: currency.address ?? ZERO_ADDRESS,
    name: currency.name ?? '',
    symbol: currency.symbol ?? '',
    decimals: currency.decimals ?? 0,
    logoURI: `${ASSETS_RELAY_API}/icons/currencies/${
      currency.id ?? currency.symbol?.toLowerCase() ?? chainId
    }.png`,
    verified: true
  }
}

const resolveTokenFromParams = (
  chains: RelayChain[] | undefined,
  chainId: number,
  rawAddress: string
): Token | undefined => {
  if (!chains?.length) {
    return undefined
  }

  const chain = chains.find((candidate) => candidate.id === chainId)

  if (!chain) {
    return undefined
  }

  const normalizedAddress = rawAddress.toLowerCase()

  const chainCurrencyAddress = chain.currency?.address?.toLowerCase()

  const isNativeRequested =
    normalizedAddress === 'native' ||
    normalizedAddress === ZERO_ADDRESS ||
    (chainCurrencyAddress !== undefined &&
      normalizedAddress === chainCurrencyAddress)

  if (isNativeRequested) {
    return buildTokenFromCurrency(chain.currency, chainId)
  }

  const currencies = chain.erc20Currencies ?? []
  const matchedCurrency = currencies.find((currency) => {
    const currencyAddress = currency?.address?.toLowerCase()

    if (!currencyAddress) {
      return false
    }

    return currencyAddress === normalizedAddress
  })

  if (matchedCurrency) {
    return buildTokenFromCurrency(matchedCurrency, chainId)
  }

  return undefined
}

const TokenWidgetPage: NextPage = () => {
  const router = useRouter()
  const relayClient = useRelayClient()
  useDynamicEvents('walletAdded', (newWallet) => {
    if (linkWalletPromise) {
      linkWalletPromise?.resolve(convertToLinkedWallet(newWallet))
      setLinkWalletPromise(undefined)
    }
  })
  const [fromToken, setFromToken] = useState<Token | undefined>({
    chainId: 8453,
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
    logoURI: 'https://assets.relay.link/icons/currencies/eth.png'
  })
  const [toToken, setToToken] = useState<Token | undefined>({
    chainId: 10,
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
    logoURI: 'https://assets.relay.link/icons/currencies/eth.png'
  })

  const getTokenKey = useCallback((token?: Token) => {
    if (!token) {
      return undefined
    }

    return `${token.chainId}:${token.address.toLowerCase()}`
  }, [])

  const { setWalletFilter } = useWalletFilter()
  const { setShowAuthFlow, primaryWallet } = useDynamicContext()
  const { theme } = useTheme()
  const [singleChainMode, setSingleChainMode] = useState(false)
  const [supportedWalletVMs, setSupportedWalletVMs] = useState<ChainVM[]>([
    ...WALLET_VM_TYPES
  ])
  const _switchWallet = useSwitchWallet()
  const { setShowLinkNewWalletModal } = useDynamicModals()
  const userWallets = useUserWallets()
  const wallets = useRef<Wallet<any>[]>([])
  const switchWallet =
    useRef<(walletId: string) => Promise<void> | undefined>(undefined)
  const [wallet, setWallet] = useState<AdaptedWallet | undefined>()
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  const urlTokenRef = useRef<Token | undefined>(undefined)
  const appliedUrlKeyRef = useRef<string | null>(null)
  const lastUpdatedUrlRef = useRef<string | null>(null)
  const hasCustomBuyTokenRef = useRef(false)
  const hasCustomSellTokenRef = useRef(false)
  const [tokenNotFound, setTokenNotFound] = useState(false)
  const [linkWalletPromise, setLinkWalletPromise] = useState<
    | {
        resolve: (value: LinkedWallet) => void
        reject: () => void
        params: { chain?: RelayChain; direction: 'to' | 'from' }
      }
    | undefined
  >()
  const [addressInput, setAddressInput] = useState('')
  const [chainInput, setChainInput] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const linkedWallets = useMemo(() => {
    const _wallets = userWallets.reduce((linkedWallets, wallet) => {
      linkedWallets.push(convertToLinkedWallet(wallet))
      return linkedWallets
    }, [] as LinkedWallet[])
    wallets.current = userWallets
    return _wallets
  }, [userWallets])

  useEffect(() => {
    if (!router.isReady || !relayClient) {
      return
    }

    const params = router.query.params
    const [addressParam, chainParam] = Array.isArray(params) ? params : []

    if (!addressParam || !chainParam) {
      setTokenNotFound(false)
      urlTokenRef.current = undefined
      appliedUrlKeyRef.current = null
      lastUpdatedUrlRef.current = router.asPath
      setAddressInput('')
      setChainInput('')
      return
    }

    const rawAddress = Array.isArray(addressParam)
      ? addressParam[0]
      : addressParam
    const rawChain = Array.isArray(chainParam) ? chainParam[0] : chainParam

    const decodedAddress = decodeURIComponent(rawAddress)
    const chainId = Number(rawChain)

    setAddressInput(decodedAddress)
    setChainInput(rawChain)

    if (Number.isNaN(chainId)) {
      setTokenNotFound(true)
      return
    }

    const resolvedToken = resolveTokenFromParams(
      relayClient.chains,
      chainId,
      decodedAddress
    )

    if (!resolvedToken) {
      setTokenNotFound(true)
      return
    }

    setTokenNotFound(false)
    setInputError(null)
    urlTokenRef.current = resolvedToken

    const key = getTokenKey(resolvedToken)
    appliedUrlKeyRef.current = key ?? null

    const canonicalPath = `/ui/token/${encodeURIComponent(
      resolvedToken.address
    )}/${resolvedToken.chainId}`
    lastUpdatedUrlRef.current = canonicalPath

    if (!hasCustomBuyTokenRef.current) {
      setToToken((previous) => {
        const previousKey = getTokenKey(previous)
        return previousKey === key ? previous : resolvedToken
      })
    }

    if (activeTab === 'sell' && !hasCustomSellTokenRef.current) {
      setFromToken((previous) => {
        const previousKey = getTokenKey(previous)
        return previousKey === key ? previous : resolvedToken
      })
    }

    hasCustomBuyTokenRef.current = false
    hasCustomSellTokenRef.current = false
  }, [
    router.isReady,
    router.query.params,
    relayClient,
    getTokenKey,
    activeTab
  ])

  useEffect(() => {
    if (activeTab === 'sell' && urlTokenRef.current && !hasCustomSellTokenRef.current) {
      const key = getTokenKey(urlTokenRef.current)
      setFromToken((previous) => {
        const previousKey = getTokenKey(previous)
        return previousKey === key ? previous : urlTokenRef.current ?? previous
      })
    }

    if (activeTab === 'buy' && urlTokenRef.current && !hasCustomBuyTokenRef.current) {
      const key = getTokenKey(urlTokenRef.current)
      setToToken((previous) => {
        const previousKey = getTokenKey(previous)
        return previousKey === key ? previous : urlTokenRef.current ?? previous
      })
    }
  }, [activeTab, getTokenKey])

  const updateDemoUrl = useCallback(
    (token?: Token) => {
      if (!router.isReady) {
        return
      }

      const basePath = '/ui/token'

      if (!token) {
        if (lastUpdatedUrlRef.current !== basePath) {
          router.replace(basePath, undefined, { shallow: true })
          lastUpdatedUrlRef.current = basePath
        }
        return
      }

      const encodedAddress = encodeURIComponent(token.address)
      const chainParam = token.chainId.toString()
      const nextPath = `${basePath}/${encodedAddress}/${chainParam}`

      if (lastUpdatedUrlRef.current === nextPath) {
        return
      }

      router.replace(
        {
          pathname: '/ui/token/[[...params]]',
          query: { params: [token.address, chainParam] }
        },
        nextPath,
        { shallow: true }
      )

      lastUpdatedUrlRef.current = nextPath
    },
    [router]
  )

  const updateDemoUrlWithRawParams = useCallback(
    (address: string, chainId: number) => {
      if (!router.isReady) {
        return
      }

      const encodedAddress = encodeURIComponent(address)
      const chainParam = chainId.toString()
      const nextPath = `/ui/token/${encodedAddress}/${chainParam}`

      if (lastUpdatedUrlRef.current === nextPath) {
        return
      }

      router.replace(
        {
          pathname: '/ui/token/[[...params]]',
          query: { params: [address, chainParam] }
        },
        nextPath,
        { shallow: true }
      )

      lastUpdatedUrlRef.current = nextPath
    },
    [router]
  )

  const handleAnalyticEvent = useCallback(
    (eventName: string, data?: any) => {
      if (eventName === 'TAB_SWITCHED') {
        const tab = data?.tab === 'sell' ? 'sell' : 'buy'
        setActiveTab(tab)
      }

      console.log('Analytic Event', eventName, data)
    },
    []
  )

  const handleApplyCustomToken = useCallback(
    (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      setInputError(null)

      const normalizedAddress = addressInput.trim()
      const normalizedChain = chainInput.trim()

      if (!normalizedAddress) {
        setInputError('Enter a token address (or symbol) to load.')
        return
      }

      const parsedChainId = Number(normalizedChain)
      if (Number.isNaN(parsedChainId)) {
        setInputError('Enter a valid chain id.')
        return
      }

      hasCustomBuyTokenRef.current = false
      hasCustomSellTokenRef.current = false

      if (!relayClient) {
        setInputError('Relay client is not ready yet. Please try again shortly.')
        updateDemoUrlWithRawParams(normalizedAddress, parsedChainId)
        return
      }

      const resolvedToken = resolveTokenFromParams(
        relayClient.chains,
        parsedChainId,
        normalizedAddress
      )

      if (resolvedToken) {
        urlTokenRef.current = resolvedToken
        appliedUrlKeyRef.current = getTokenKey(resolvedToken) ?? null
        setTokenNotFound(false)
        updateDemoUrl(resolvedToken)
      } else {
        setTokenNotFound(true)
        setInputError('Token not found on the specified chain. Showing last known state.')
        updateDemoUrlWithRawParams(normalizedAddress, parsedChainId)
      }
    },
    [
      addressInput,
      chainInput,
      relayClient,
      getTokenKey,
      updateDemoUrl,
      updateDemoUrlWithRawParams
    ]
  )

  useEffect(() => {
    switchWallet.current = _switchWallet
  }, [_switchWallet])

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
        background: theme === 'light' ? 'rgba(245, 242, 255, 1)' : '#1c172b'
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
            gap: 8
          }}
        >
          <form onSubmit={handleApplyCustomToken} style={{ width: '100%' }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <input
                value={addressInput}
                onChange={(event) => setAddressInput(event.target.value)}
                placeholder="Token address"
                style={{
                  flex: '1 1 240px',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(148, 163, 184, 0.4)'
                }}
                autoComplete="off"
              />
              <input
                value={chainInput}
                onChange={(event) => setChainInput(event.target.value)}
                placeholder="Chain ID"
                style={{
                  width: 120,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(148, 163, 184, 0.4)'
                }}
                inputMode="numeric"
                autoComplete="off"
              />
              <button
                type="submit"
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: '#4f46e5',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Load token
              </button>
            </div>
          </form>
          {inputError ? (
            <p
              style={{
                margin: 0,
                color: '#b91c1c',
                fontSize: 12
              }}
            >
              {inputError}
            </p>
          ) : null}
          {tokenNotFound ? (
            <p
              style={{
                margin: 0,
                padding: '8px 12px',
                borderRadius: 12,
                background: 'rgba(255, 231, 231, 0.6)',
                color: '#9f1239',
                fontSize: 14
              }}
            >
              Token from URL was not found on the specified chain. Please
              select a token manually to continue.
            </p>
          ) : null}
          <TokenWidget
            key={`swap-widget-${singleChainMode ? 'single' : 'multi'}-chain`}
            lockChainId={singleChainMode ? 8453 : undefined}
            singleChainMode={singleChainMode}
            supportedWalletVMs={supportedWalletVMs}
            sponsoredTokens={[
              '792703809:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              '130:0x078d782b760474a361dda0af3839290b0ef57ad6',
              '103665049:0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
              '8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
              '43114:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
              '137:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
              '42161:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
              '10:0x0b2c639c533813f4aa9d7837caf62653d097ff85'
            ]}
            // popularChainIds={[]}
            // disableInputAutoFocus={true}
            toToken={toToken}
            setToToken={setToToken}
            // lockToToken={true}
            // lockFromToken={true}
            fromToken={fromToken}
            setFromToken={setFromToken}
            // defaultAmount={'5'}
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
              hasCustomSellTokenRef.current = token !== undefined
              if (token) {
                urlTokenRef.current = token
              }
              if (activeTab === 'sell') {
                updateDemoUrl(token)
              }
              if (token) {
                setTokenNotFound(false)
              }
            }}
            onToTokenChange={(token) => {
              setToToken(token)
              hasCustomBuyTokenRef.current = token !== undefined
              if (token) {
                urlTokenRef.current = token
              }
              if (activeTab === 'buy') {
                updateDemoUrl(token)
              }
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
            slippageTolerance={undefined}
            onOpenSlippageConfig={() => {
              // setSlippageToleranceConfigOpen(true)
            }}
          />
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
