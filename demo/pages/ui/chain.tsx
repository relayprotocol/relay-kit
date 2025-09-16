import { NextPage } from 'next'
import { LinkedWallet, SwapWidget } from '@relayprotocol/relay-kit-ui'
import { Layout } from 'components/Layout'
import {
  useDynamicContext,
  useDynamicEvents,
  useDynamicModals,
  useSwitchWallet,
  useUserWallets,
  Wallet
} from '@dynamic-labs/sdk-react-core'
import { useTheme } from 'next-themes'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AdaptedWallet,
  adaptViemWallet,
  RelayChain
} from '@relayprotocol/relay-sdk'
import { isSolanaWallet } from '@dynamic-labs/solana'
import { adaptSolanaWallet } from '@relayprotocol/relay-svm-wallet-adapter'
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { useWalletFilter } from 'context/walletFilter'
import { isBitcoinWallet } from '@dynamic-labs/bitcoin'
import { adaptBitcoinWallet } from '@relayprotocol/relay-bitcoin-wallet-adapter'
import { convertToLinkedWallet } from 'utils/dynamic'
import { Token } from '@relayprotocol/relay-kit-ui'

const ChainWidgetPage: NextPage = () => {
  const { setShowAuthFlow, primaryWallet } = useDynamicContext()
  const { setShowLinkNewWalletModal } = useDynamicModals()
  const { theme } = useTheme()
  const [toToken, setToToken] = useState<Token | undefined>({
    chainId: 8453,
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    decimals: 6,
    name: 'USDC',
    symbol: 'USDC',
    logoURI: 'https://ethereum-optimism.github.io/data/USDC/logo.png'
  })
  useDynamicEvents('walletAdded', (newWallet) => {
    if (linkWalletPromise) {
      linkWalletPromise.resolve(convertToLinkedWallet(newWallet))
      setLinkWalletPromise(undefined)
    }
  })
  const { setWalletFilter } = useWalletFilter()
  const _switchWallet = useSwitchWallet()
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
          if (isSolanaWallet(primaryWallet)) {
            const connection = await primaryWallet.getConnection()
            const signer = await primaryWallet.getSigner()

            adaptedWallet = adaptSolanaWallet(
              primaryWallet.address,
              792703809,
              connection,
              signer.signAndSendTransaction
            )
          } else if (isEthereumWallet(primaryWallet)) {
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 50,
          paddingInline: '10px'
        }}
      >
        <SwapWidget
          lockChainId={8453}
          wallet={wallet}
          supportedWalletVMs={['bvm', 'evm', 'svm']}
          toToken={toToken}
          setToToken={setToToken}
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
          onFromTokenChange={(token) =>
            console.log('From token changed to: ', token)
          }
          onToTokenChange={(token) =>
            console.log('To token changed to: ', token)
          }
          onSwapError={(e, data) => {
            console.log('onSwapError Triggered', e, data)
          }}
          onSwapSuccess={(data) => {
            console.log('onSwapSuccess Triggered', data)
          }}
        />
      </div>
    </Layout>
  )
}

export default ChainWidgetPage
