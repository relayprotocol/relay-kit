import { NextPage } from 'next'
import { useEffect, useMemo, useState } from 'react'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { DemoPage, DemoOutput } from 'components/DemoPage'
import {
  type QuoteBody,
  type AdaptedWallet,
  type Execute,
  adaptViemWallet
} from '@relayprotocol/relay-sdk'
import { createFastFillWallet } from 'utils/createFastFillWallet'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { isSolanaWallet } from '@dynamic-labs/solana'
import { isBitcoinWallet } from '@dynamic-labs/bitcoin'
import { isTronWallet, type TronWallet } from '@dynamic-labs/tron'
import { adaptSolanaWallet } from '@relayprotocol/relay-svm-wallet-adapter'
import { adaptBitcoinWallet } from '@relayprotocol/relay-bitcoin-wallet-adapter'
import { adaptTronWallet } from '@relayprotocol/relay-tron-wallet-adapter'

const FastFillPage: NextPage = () => {
  const client = useRelayClient()
  const { primaryWallet } = useDynamicContext()
  const [quoteParams, setQuoteParams] = useState<string>('')
  const [quote, setQuote] = useState<Execute | null>(null)
  const [result, setResult] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'password' | 'apiKey'>('password')
  const [fastFillPassword, setFastFillPassword] = useState<string>('')
  const [fastFillApiKey, setFastFillApiKey] = useState<string>('')
  const [solverInputCurrencyAmount, setSolverInputCurrencyAmount] = useState<string>('')
  const [adaptedWallet, setAdaptedWallet] = useState<AdaptedWallet | null>(null)

  // Adapt wallet whenever primaryWallet changes
  useEffect(() => {
    const adaptWallet = async () => {
      if (!primaryWallet) {
        setAdaptedWallet(null)
        return
      }

      try {
        let wallet: AdaptedWallet | null = null

        if (isEthereumWallet(primaryWallet)) {
          const walletClient = await primaryWallet.getWalletClient()
          wallet = adaptViemWallet(walletClient)
        } else if (isSolanaWallet(primaryWallet)) {
          const connection = await primaryWallet.getConnection()
          const signer = await primaryWallet.getSigner()

          if (!connection || !signer?.signTransaction) {
            throw new Error('Unable to setup Solana wallet')
          }

          wallet = adaptSolanaWallet(
            primaryWallet.address,
            792703809, // Solana chain ID
            connection,
            signer.signAndSendTransaction
          )
        } else if (isBitcoinWallet(primaryWallet)) {
          wallet = adaptBitcoinWallet(
            primaryWallet.address,
            async (_address, _psbt, dynamicParams) => {
              const response = await primaryWallet.signPsbt(dynamicParams)
              if (!response) {
                throw new Error('Missing psbt response')
              }
              return response.signedPsbt
            }
          )
        } else if (isTronWallet(primaryWallet)) {
          const tronWeb = (primaryWallet as TronWallet).getTronWeb()
          if (!tronWeb) {
            throw new Error('Unable to setup Tron wallet')
          }
          wallet = adaptTronWallet(
            (primaryWallet as TronWallet).address,
            tronWeb
          )
        }
        // Note: Hyperliquid wallets are EVM-compatible and handled by the isEthereumWallet path above.
        // The SDK automatically converts Hyperliquid transaction steps to signature steps (chain ID 1337).

        setAdaptedWallet(wallet)
      } catch (e: any) {
        console.error('Error adapting wallet:', e)
        setError(`Error adapting wallet: ${e?.message || String(e)}`)
        setAdaptedWallet(null)
      }
    }

    adaptWallet()
  }, [primaryWallet])

  const handleExecute = async () => {
    if (!client) {
      setError('Missing Client!')
      return
    }
    if (!adaptedWallet) {
      setError('Please connect your wallet!')
      return
    }
    if (!quote) {
      setError('Please get a quote first!')
      return
    }

    setError(null)
    setResult(null)
    setProgress(null)
    setLoading(true)

    const authValue = authMode === 'password' ? fastFillPassword : fastFillApiKey
    if (!authValue) {
      setError(authMode === 'password' ? 'Fast fill password is required' : 'API key is required')
      setLoading(false)
      return
    }

    try {
      // Wrap the adapted wallet with our fastFill wrapper
      const auth = authMode === 'password'
        ? { password: fastFillPassword }
        : { apiKey: fastFillApiKey }
      const fastFillWallet = createFastFillWallet(
        adaptedWallet,
        auth,
        solverInputCurrencyAmount || undefined
      )

      // Execute the quote with the fastFill wallet adapter
      const executeResult = await client.actions.execute({
        wallet: fastFillWallet,
        quote,
        onProgress: setProgress
      })

      setResult(executeResult.data)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const handleGetQuote = async () => {
    if (!client) {
      setError('Missing Client!')
      return
    }
    if (!adaptedWallet || !primaryWallet) {
      setError('Please connect your wallet!')
      return
    }

    setError(null)
    setQuote(null)
    setLoading(true)

    try {
      let params: QuoteBody
      if (quoteParams.trim()) {
        params = JSON.parse(quoteParams)
      } else {
        setError('Please provide quote parameters as JSON')
        setLoading(false)
        return
      }

      const userAddress = primaryWallet.address
      if (!userAddress) {
        setError('Could not get address from connected wallet')
        setLoading(false)
        return
      }

      const quoteResult = await client.actions.getQuote(
        {
          chainId: params.originChainId,
          toChainId: params.destinationChainId,
          currency: params.originCurrency,
          toCurrency: params.destinationCurrency,
          amount: params.amount,
          tradeType: params.tradeType,
          wallet: adaptedWallet,
          user: userAddress,
          recipient: params.recipient ?? userAddress
        },
        true
      )

      setQuote(quoteResult)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const progressString = useMemo(() => {
    try {
      return JSON.stringify(progress, null, 2)
    } catch (e) {
      return ''
    }
  }, [progress])

  return (
    <DemoPage eyebrow="SDK write action" title="Fast Fill">
      <div className="demo-panel">
        {adaptedWallet && (
          <div className="demo-subtitle">
            Connected wallet VM type: <b>{adaptedWallet.vmType}</b>
          </div>
        )}

        <div>
          <label>Quote Parameters (JSON)</label>
          <div className="demo-hint">
            Note that user/recipient are not required — they are taken from the
            connected wallet. This demo now supports all wallet types: EVM,
            Solana (SVM), Bitcoin (BVM), Tron (TVM), and Hyperliquid.
          </div>
          <textarea
            value={quoteParams}
            onChange={(e) => setQuoteParams(e.target.value)}
            placeholder='{"originChainId": 1, "destinationChainId": 8453, "originCurrency": "0x0000000000000000000000000000000000000000", "destinationCurrency": "0x0000000000000000000000000000000000000000", "amount": "1000000000000000000", "tradeType": "EXACT_INPUT"}'
            style={{ minHeight: 150 }}
          />
        </div>

        <button
          disabled={!adaptedWallet || loading || !quoteParams.trim()}
          onClick={handleGetQuote}
        >
          {loading && !quote ? 'Getting Quote...' : 'Get Quote'}
        </button>

        {quote && quote.steps && (
          <div>
            <label>Quote obtained! Request ID</label>
            <pre className="demo-output">
              {quote.steps.find((step) => step.requestId)?.requestId ??
                'No request ID found'}
            </pre>
          </div>
        )}

        <div>
          <label>Authentication Mode</label>
          <div>
            <input
              id="fast-fill-auth-password"
              type="radio"
              name="authMode"
              value="password"
              checked={authMode === 'password'}
              onChange={() => setAuthMode('password')}
            />
            <label htmlFor="fast-fill-auth-password">
              Password (server API key)
            </label>
          </div>
          <div>
            <input
              id="fast-fill-auth-api-key"
              type="radio"
              name="authMode"
              value="apiKey"
              checked={authMode === 'apiKey'}
              onChange={() => setAuthMode('apiKey')}
            />
            <label htmlFor="fast-fill-auth-api-key">API Key (direct)</label>
          </div>
        </div>

        {authMode === 'password' ? (
          <div>
            <label>Fast Fill Password</label>
            <input
              type="password"
              value={fastFillPassword}
              onChange={(e) => setFastFillPassword(e.target.value)}
              placeholder="Enter fast fill password"
            />
          </div>
        ) : (
          <div>
            <label>API Key</label>
            <input
              type="password"
              value={fastFillApiKey}
              onChange={(e) => setFastFillApiKey(e.target.value)}
              placeholder="Enter your Relay API key"
            />
          </div>
        )}

        <div>
          <label>Solver Input Currency Amount (Optional)</label>
          <input
            type="text"
            value={solverInputCurrencyAmount}
            onChange={(e) => setSolverInputCurrencyAmount(e.target.value)}
            placeholder="Enter solver input currency amount"
          />
        </div>

        <button
          disabled={
            !adaptedWallet ||
            !quote ||
            loading ||
            !(authMode === 'password'
              ? fastFillPassword
              : fastFillApiKey
            ).trim()
          }
          onClick={handleExecute}
        >
          {loading ? 'Executing with Fast Fill...' : 'Execute with Fast Fill'}
        </button>

        {error && <div className="demo-error">{error}</div>}
      </div>

      {progress && (
        <section className="demo-panel">
          <h2>Progress</h2>
          <pre className="demo-output">{progressString}</pre>
        </section>
      )}

      {result && <DemoOutput title="Result" data={result} />}
    </DemoPage>
  )
}

export default FastFillPage
