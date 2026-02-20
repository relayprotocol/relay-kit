import { NextPage, GetServerSideProps } from 'next'
import { SwapWidget, RelayKitProvider } from '@relayprotocol/relay-kit-ui-v2'
import { Layout } from 'components/Layout'
import { MAINNET_RELAY_API } from '@relayprotocol/relay-sdk'
import { useTheme } from 'next-themes'
import {
  useDynamicContext,
  useDynamicModals,
  useUserWallets
} from '@dynamic-labs/sdk-react-core'
import { useEffect, useMemo, useState } from 'react'
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { adaptViemWallet, AdaptedWallet } from '@relayprotocol/relay-sdk'
import Head from 'next/head'
import type { Token, LinkedWallet } from '@relayprotocol/relay-kit-ui-v2'
import { convertToLinkedWallet } from 'utils/dynamic'
import { isBitcoinWallet } from '@dynamic-labs/bitcoin'
import { adaptBitcoinWallet } from '@relayprotocol/relay-bitcoin-wallet-adapter'

// ─── Main page ───────────────────────────────────────────────────────────────

const SwapV2Page: NextPage = () => {
  const [fromToken, setFromToken] = useState<Token | undefined>({
    chainId: 8453,
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
    logoURI: 'https://assets.relay.link/icons/currencies/eth.png',
    verified: true
  })
  const [toToken, setToToken] = useState<Token | undefined>({
    chainId: 10,
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
    logoURI: 'https://assets.relay.link/icons/currencies/eth.png',
    verified: true
  })

  const { setShowAuthFlow, primaryWallet } = useDynamicContext()
  const { setShowLinkNewWalletModal } = useDynamicModals()
  const { theme } = useTheme()
  const userWallets = useUserWallets()
  const [wallet, setWallet] = useState<AdaptedWallet | undefined>()

  const linkedWallets = useMemo<LinkedWallet[]>(() => {
    return userWallets.map((w) => convertToLinkedWallet(w))
  }, [userWallets])

  useEffect(() => {
    const adapt = async () => {
      if (!primaryWallet) {
        setWallet(undefined)
        return
      }
      try {
        if (isEthereumWallet(primaryWallet)) {
          const walletClient = await primaryWallet.getWalletClient()
          setWallet(adaptViemWallet(walletClient))
        } else if (isBitcoinWallet(primaryWallet)) {
          const linked = convertToLinkedWallet(primaryWallet)
          const publicKey = primaryWallet.additionalAddresses.find(
            ({ address, type }) =>
              address === linked.address && type === 'payment'
          )?.publicKey
          setWallet(
            adaptBitcoinWallet(
              linked.address,
              async (_address, _psbt, dynamicParams) => {
                const response = await primaryWallet.signPsbt(dynamicParams)
                if (!response) throw new Error('Missing psbt response')
                return response.signedPsbt
              },
              publicKey
            )
          )
        }
      } catch {
        setWallet(undefined)
      }
    }
    adapt()
  }, [primaryWallet, primaryWallet?.address])

  return (
    <Layout
      styles={{
        background: theme === 'light' ? 'rgba(245, 242, 255, 1)' : '#1c172b'
      }}
    >
      <Head>
        <title>Swap Widget V2</title>
        <meta name="description" content="Relay Kit UI v2 Swap Widget" />
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
        {/* The new SwapWidget — wrapped in its own provider */}
        <RelayKitProvider options={{ baseApiUrl: MAINNET_RELAY_API }}>
          <SwapWidget
            fromToken={fromToken}
            setFromToken={setFromToken}
            toToken={toToken}
            setToToken={setToToken}
            wallet={wallet}
            supportedWalletVMs={['evm', 'bvm', 'svm']}
            linkedWallets={linkedWallets}
            multiWalletSupportEnabled={true}
            onConnectWallet={() => {
              // If already connected, link a new wallet; otherwise open auth flow
              if (primaryWallet) {
                setShowLinkNewWalletModal(true)
              } else {
                setShowAuthFlow(true)
              }
            }}
            onAnalyticEvent={(eventName, data) => {
              console.log('[relay-kit-ui-v2] Analytic Event:', eventName, data)
            }}
            onSwapError={(e, data) => {
              console.error('[relay-kit-ui-v2] Swap error:', e, data)
            }}
            onSwapSuccess={(data) => {
              console.log('[relay-kit-ui-v2] Swap success:', data)
            }}
          />
        </RelayKitProvider>
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: { ssr: true } }
}

export default SwapV2Page
