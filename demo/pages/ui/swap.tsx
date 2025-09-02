import { NextPage, GetServerSideProps } from 'next'
import {
  SlippageToleranceConfig,
  SwapWidget
} from '@relayprotocol/relay-kit-ui'
import { Layout } from 'components/Layout'
import { useTheme } from 'next-themes'
import {
  useDynamicContext,
  useDynamicEvents,
  useDynamicModals,
  useSwitchWallet,
  useUserWallets,
  Wallet
} from '@dynamic-labs/sdk-react-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { isSolanaWallet } from '@dynamic-labs/solana'
import { adaptSolanaWallet } from '@relayprotocol/relay-svm-wallet-adapter'
import {
  AdaptedWallet,
  adaptViemWallet,
  ChainVM,
  RelayChain
} from '@relayprotocol/relay-sdk'
import { useWalletFilter } from 'context/walletFilter'
import { LinkedWallet } from '@relayprotocol/relay-kit-ui'
import { adaptBitcoinWallet } from '@relayprotocol/relay-bitcoin-wallet-adapter'
import { isBitcoinWallet } from '@dynamic-labs/bitcoin'
import { convertToLinkedWallet } from 'utils/dynamic'
import { isEclipseWallet } from '@dynamic-labs/eclipse'
import { type Token } from '@relayprotocol/relay-kit-ui'
import { isSuiWallet, SuiWallet } from '@dynamic-labs/sui'
import { adaptSuiWallet } from '@relayprotocol/relay-sui-wallet-adapter'
import Head from 'next/head'

const WALLET_VM_TYPES = ['evm', 'bvm', 'svm', 'suivm'] as const

const SwapWidgetPage: NextPage = () => {
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
  const wallets = useRef<Wallet<any>[]>()
  const switchWallet = useRef<(walletId: string) => Promise<void>>()
  const [wallet, setWallet] = useState<AdaptedWallet | undefined>()
  const [linkWalletPromise, setLinkWalletPromise] = useState<
    | {
        resolve: (value: LinkedWallet) => void
        reject: () => void
        params: { chain?: RelayChain; direction: 'to' | 'from' }
      }
    | undefined
  >()
  const [slippageTolerance, setSlippageTolerance] = useState<
    string | undefined
  >(undefined)

  const linkedWallets = useMemo(() => {
    const _wallets = userWallets.reduce((linkedWallets, wallet) => {
      linkedWallets.push(convertToLinkedWallet(wallet))
      return linkedWallets
    }, [] as LinkedWallet[])
    wallets.current = userWallets
    return _wallets
  }, [userWallets])

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
              }
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
        <title>Swap Widget</title>
        <meta name="description" content="Swap Widget" />
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
          <div
            style={{ width: '100%', display: 'flex', justifyContent: 'end' }}
          >
            <SlippageToleranceConfig
              setSlippageTolerance={setSlippageTolerance}
              onAnalyticEvent={(eventName, data) => {
                console.log('Analytic Event', eventName, data)
              }}
            />
          </div>
          <SwapWidget
            key={`swap-widget-${singleChainMode ? 'single' : 'multi'}-chain`}
            lockChainId={singleChainMode ? 8453 : undefined}
            singleChainMode={singleChainMode}
            supportedWalletVMs={supportedWalletVMs}
            sponsoredTokens={
              toToken?.chainId !== 1
                ? [
                    '8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
                    '42161:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
                    '10:0x0b2c639c533813f4aa9d7837caf62653d097ff85',
                    '1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
                  ]
                : undefined
            }
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
            onAnalyticEvent={(eventName, data) => {
              console.log('Analytic Event', eventName, data)
            }}
            onFromTokenChange={(token) => {
              console.log('From token changed to: ', token)
            }}
            onToTokenChange={(token) =>
              console.log('To token changed to: ', token)
            }
            onSwapError={(e, data) => {
              console.log('onSwapError Triggered', e, data)
            }}
            onSwapSuccess={(data) => {
              console.log('onSwapSuccess Triggered', data)
            }}
            slippageTolerance={slippageTolerance}
          />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '40px',
          gap: '20px'
        }}
      >
        <div>
          <label>Single Chain Mode: </label>
          <input
            type="checkbox"
            checked={singleChainMode}
            onChange={(e) => setSingleChainMode(e.target.checked)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            Supported Wallet VMs:
          </div>
          {WALLET_VM_TYPES.map((vm) => (
            <div
              key={vm}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <label htmlFor={`vm-${vm}`}>{vm.toUpperCase()}: </label>
              <input
                id={`vm-${vm}`}
                type="checkbox"
                checked={supportedWalletVMs.includes(vm)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSupportedWalletVMs((prev) => [...prev, vm])
                  } else {
                    setSupportedWalletVMs((prev) =>
                      prev.filter((item) => item !== vm)
                    )
                  }
                }}
              />
            </div>
          ))}
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

export default SwapWidgetPage
