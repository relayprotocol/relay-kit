import { NextPage } from 'next'
import { useEffect, useMemo, useState } from 'react'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { ConnectButton } from 'components/ConnectButton'
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
import { isSuiWallet } from '@dynamic-labs/sui'
import { isTronWallet, type TronWallet } from '@dynamic-labs/tron'
import { adaptSolanaWallet } from '@relayprotocol/relay-svm-wallet-adapter'
import { adaptBitcoinWallet } from '@relayprotocol/relay-bitcoin-wallet-adapter'
import { adaptSuiWallet } from '@relayprotocol/relay-sui-wallet-adapter'
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
  const [fastFillPassword, setFastFillPassword] = useState<string>('')
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
        } else if (isSuiWallet(primaryWallet)) {
          const walletClient = await primaryWallet.getWalletClient()

          if (!walletClient) {
            throw new Error('Unable to setup Sui wallet')
          }

          wallet = adaptSuiWallet(
            primaryWallet.address,
            784, // Sui chain ID placeholder - will be updated based on quote params
            walletClient,
            async (tx) => {
              const signedTransaction = await primaryWallet.signTransaction(tx)
              const executionResult = await walletClient.executeTransactionBlock({
                options: {},
                signature: signedTransaction.signature,
                transactionBlock: signedTransaction.bytes
              })
              return executionResult
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

    if (!fastFillPassword) {
      setError('Fast fill password is required')
      setLoading(false)
      return
    }

    try {
      // Wrap the adapted wallet with our fastFill wrapper
      const fastFillWallet = createFastFillWallet(
        adaptedWallet,
        fastFillPassword,
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: 24,
        paddingTop: 150,
        maxWidth: 1000,
        margin: '0 auto'
      }}
    >
      <ConnectButton />

      {adaptedWallet && (
        <div
          style={{
            width: '100%',
            padding: '10px',
            background: '#e0f0ff',
            borderRadius: '8px',
            marginBottom: 10
          }}
        >
          <b>Connected Wallet VM Type:</b> {adaptedWallet.vmType}
        </div>
      )}

      <div style={{ width: '100%' }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
          Quote Parameters (JSON):
        </label>
        <div
          style={{
            fontSize: 12,
            fontWeight: 200,
            fontStyle: 'italic',
            marginBottom: 8,
            color: '#666'
          }}
        >
          Note that user/recipient are not required — they are taken from the
          connected wallet. This demo now supports all wallet types: EVM, Solana
          (SVM), Bitcoin (BVM), Sui, Tron (TVM), and Hyperliquid.
        </div>
        <textarea
          value={quoteParams}
          onChange={(e) => setQuoteParams(e.target.value)}
          placeholder='{"originChainId": 1, "destinationChainId": 8453, "originCurrency": "0x0000000000000000000000000000000000000000", "destinationCurrency": "0x0000000000000000000000000000000000000000", "amount": "1000000000000000000", "tradeType": "EXACT_INPUT"}'
          style={{
            width: '100%',
            minHeight: 150,
            padding: 12,
            fontFamily: 'monospace',
            fontSize: 12,
            border: '1px solid #ccc',
            borderRadius: 8
          }}
        />
      </div>

      <button
        style={{
          padding: 16,
          background: 'blue',
          color: 'white',
          fontSize: 16,
          border: '1px solid #ffffff',
          borderRadius: 8,
          fontWeight: 700,
          cursor: 'pointer',
          width: '100%'
        }}
        disabled={!adaptedWallet || loading || !quoteParams.trim()}
        onClick={handleGetQuote}
      >
        {loading && !quote ? 'Getting Quote...' : 'Get Quote'}
      </button>

      {quote && quote.steps && (
        <div
          style={{
            width: '100%',
            padding: '10px',
            background: '#e0ffe0',
            borderRadius: '8px',
            marginTop: 10
          }}
        >
          <b>Quote obtained! Request ID:</b>
          <pre style={{ fontSize: 11, overflow: 'auto', maxHeight: 200 }}>
            {quote.steps.find((step) => step.requestId)?.requestId ?? 'No request ID found'}
          </pre>
        </div>
      )}

      <div style={{ width: '100%' }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
          Fast Fill Password:
        </label>
        <input
          type="password"
          value={fastFillPassword}
          onChange={(e) => setFastFillPassword(e.target.value)}
          placeholder="Enter fast fill password"
          style={{
            width: '100%',
            padding: 12,
            fontSize: 14,
            border: '1px solid #ccc',
            borderRadius: 8
          }}
        />
      </div>

      <div style={{ width: '100%' }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
          Solver Input Currency Amount (Optional):
        </label>
        <input
          type="text"
          value={solverInputCurrencyAmount}
          onChange={(e) => setSolverInputCurrencyAmount(e.target.value)}
          placeholder="Enter solver input currency amount"
          style={{
            width: '100%',
            padding: 12,
            fontSize: 14,
            border: '1px solid #ccc',
            borderRadius: 8
          }}
        />
      </div>

      <button
        style={{
          marginTop: 20,
          padding: 16,
          background: 'green',
          color: 'white',
          fontSize: 16,
          border: '1px solid #ffffff',
          borderRadius: 8,
          fontWeight: 700,
          cursor: 'pointer',
          width: '100%'
        }}
        disabled={!adaptedWallet || !quote || loading || !fastFillPassword.trim()}
        onClick={handleExecute}
      >
        {loading ? 'Executing with Fast Fill...' : 'Execute with Fast Fill'}
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: 10, width: '100%' }}>
          <b>Error:</b> {error}
        </div>
      )}

      {progress && (
        <div
          style={{
            marginTop: 20,
            padding: '10px',
            background: '#f0f0f0',
            borderRadius: '8px',
            width: '100%'
          }}
        >
          <b>Progress:</b>
          <pre style={{ fontSize: 11, overflow: 'auto', maxHeight: 300 }}>
            {progressString}
          </pre>
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: 20,
            padding: '10px',
            background: '#e0ffe0',
            borderRadius: '8px',
            width: '100%'
          }}
        >
          <b>Result:</b>
          <pre style={{ fontSize: 11, overflow: 'auto', maxHeight: 300 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default FastFillPage
