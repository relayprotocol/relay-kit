import { NextPage } from 'next'
import { SwapWidget, Token } from '@relayprotocol/relay-kit-ui'
import { Layout } from 'components/Layout'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { useState } from 'react'

const SingleWalletPage: NextPage = () => {
  const [singleChainMode, setSingleChainMode] = useState(false)
  const [toToken, setToToken] = useState<Token | undefined>(
    singleChainMode
      ? {
          chainId: 8453,
          address: '0x4200000000000000000000000000000000000006',
          decimals: 18,
          name: 'WETH',
          symbol: 'WETH',
          logoURI:
            'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png'
        }
      : {
          chainId: 10,
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          name: 'ETH',
          symbol: 'ETH',
          logoURI: 'https://assets.relay.link/icons/currencies/eth.png'
        }
  )
  const [fromToken, setFromToken] = useState<Token | undefined>({
    chainId: 8453,
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
    logoURI: 'https://assets.relay.link/icons/currencies/eth.png'
  })
  const { setShowAuthFlow, primaryWallet } = useDynamicContext()

  return (
    <Layout>
      <div className="demo-widget-stage">
        <SwapWidget
          key={`swap-widget-${singleChainMode ? 'single' : 'multi'}-chain`}
          lockChainId={singleChainMode ? 8453 : undefined}
          singleChainMode={singleChainMode}
          supportedWalletVMs={['evm', 'bvm', 'svm']}
          toToken={toToken}
          setToToken={setToToken}
          // lockToToken={true}
          // lockFromToken={true}
          fromToken={fromToken}
          setFromToken={setFromToken}
          // defaultFromToken={{
          //   chainId: 1,
          //   address: '0x446c9033e7516d820cc9a2ce2d0b7328b579406f',
          //   decimals: 8,
          //   name: 'SOLVE',
          //   symbol: 'SOLVE',
          //   logoURI:
          //     'https://assets.coingecko.com/coins/images/1768/large/Solve.Token_logo_200_200_wiyhout_BG.png?1575869846'
          // }}
          // defaultAmount={'5'}
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
        <div className="demo-panel" style={{ width: '100%', maxWidth: 400 }}>
          <div>
            <label>Single Chain Mode</label>
            <input
              type="checkbox"
              checked={singleChainMode}
              onChange={(e) => setSingleChainMode(e.target.checked)}
            />
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default SingleWalletPage
