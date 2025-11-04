import type { NextPage, GetServerSideProps } from 'next'
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
  type Wallet
} from '@dynamic-labs/sdk-react-core'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from 'react'
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { isSolanaWallet } from '@dynamic-labs/solana'
import { adaptSolanaWallet } from '@relayprotocol/relay-svm-wallet-adapter'
import {
  adaptViemWallet,
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

  // Default tokens
  const [fromToken, setFromToken] = useState<Token | undefined>()
  const [toToken, setToToken] = useState<Token | undefined>()

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

  // State for manual token input
  const [addressInput, setAddressInput] = useState('')
  const [chainInput, setChainInput] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [tokenNotFound, setTokenNotFound] = useState(false)

  const linkedWallets = useMemo(() => {
    const _wallets = userWallets.reduce((linkedWallets, wallet) => {
      linkedWallets.push(convertToLinkedWallet(wallet))
      return linkedWallets
    }, [] as LinkedWallet[])
    wallets.current = userWallets
    return _wallets
  }, [userWallets])

  // Parse URL params
  useEffect(() => {
    if (!router.isReady) {
      return
    }

    const params = router.query.params
    const [addressParam, chainParam] = Array.isArray(params) ? params : []

    if (!addressParam || !chainParam) {
      setUrlTokenAddress(undefined)
      setUrlTokenChainId(undefined)
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

    if (!Number.isNaN(chainId)) {
      setUrlTokenAddress(decodedAddress)
      setUrlTokenChainId(chainId)
      // Auto-populate form inputs with URL params
      setAddressInput(decodedAddress)
      setChainInput(chainId.toString())
      setTokenNotFound(false)
    }
  }, [router.isReady, router.query.params])

  const updateDemoUrl = useCallback(
    (token?: Token) => {
      if (!router.isReady) {
        return
      }

      const basePath = '/ui/token'

      if (!token) {
        router.replace(basePath, undefined, { shallow: true })
        return
      }

      const encodedAddress = encodeURIComponent(token.address)
      const chainParam = token.chainId.toString()
      const nextPath = `${basePath}/${encodedAddress}/${chainParam}`

      router.replace(
        {
          pathname: '/ui/token/[[...params]]',
          query: { params: [token.address, chainParam] }
        },
        nextPath,
        { shallow: true }
      )
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

      setFromToken(undefined)
      setToToken(undefined)
      setTokenNotFound(false)

      // Update the URL with the new token params
      setUrlTokenAddress(normalizedAddress)
      setUrlTokenChainId(parsedChainId)
      updateDemoUrlWithRawParams(normalizedAddress, parsedChainId)
    },
    [addressInput, chainInput, updateDemoUrlWithRawParams]
  )

  useEffect(() => {
    switchWallet.current = _switchWallet
  }, [_switchWallet])

  // Check if token should have loaded but didn't (token not found)
  useEffect(() => {
    if (urlTokenAddress && urlTokenChainId && !fromToken && relayClient) {
      // Wait a bit for the query to complete, then check if token was not found
      const timer = setTimeout(() => {
        if (!fromToken) {
          setTokenNotFound(true)
        }
      }, 2000) // Wait 2 seconds for token query to complete

      return () => clearTimeout(timer)
    }
  }, [urlTokenAddress, urlTokenChainId, fromToken, relayClient])

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
            alignItems: 'center',
            gap: 20
          }}
        >
          <TokenWidget
            key={`swap-widget-${singleChainMode ? 'single' : 'multi'}-chain`}
            lockChainId={singleChainMode ? 8453 : undefined}
            singleChainMode={singleChainMode}
            supportedWalletVMs={supportedWalletVMs}
            toToken={toToken}
            setToToken={setToToken}
            fromToken={fromToken}
            setFromToken={setFromToken}
            defaultFromTokenAddress={urlTokenAddress}
            defaultFromTokenChainId={urlTokenChainId}
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
                updateDemoUrl(token)
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
            slippageTolerance={undefined}
            onOpenSlippageConfig={() => {
              // setSlippageToleranceConfigOpen(true)
            }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              width: '100%',
              maxWidth: 400
            }}
          >
            <form onSubmit={handleApplyCustomToken} style={{ width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center'
                }}
              >
                <input
                  value={addressInput}
                  onChange={(event) => setAddressInput(event.target.value)}
                  placeholder="Token address"
                  style={{
                    flex: '2',
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
                    flex: '1',
                    minWidth: 100,
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
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
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
                  fontSize: 12,
                  textAlign: 'center'
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
                  fontSize: 14,
                  textAlign: 'center'
                }}
              >
                Token from URL was not found on the specified chain. Please
                select a token manually to continue.
              </p>
            ) : null}
          </div>
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
