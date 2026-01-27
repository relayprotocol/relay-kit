import { NextPage } from 'next'
import { useMemo, useState } from 'react'
import { useWalletClient } from 'wagmi'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { ConnectButton } from 'components/ConnectButton'
import {
  adaptViemWallet,
  type QuoteBody,
  type AdaptedWallet,
  type Execute,
  type TransactionStepItem
} from '@relayprotocol/relay-sdk'

const FastFillPage: NextPage = () => {
  const { data: wallet } = useWalletClient()
  const client = useRelayClient()
  const [quoteParams, setQuoteParams] = useState<string>('')
  const [quote, setQuote] = useState<Execute | null>(null)
  const [result, setResult] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fastFillPassword, setFastFillPassword] = useState<string>('')

  // Create a custom wallet adapter that wraps the viemWallet adapter
  // and intercepts handleSendTransactionStep to call fastFill
  const createFastFillWalletAdapter = (
    originalWallet: AdaptedWallet,
    password: string
  ): AdaptedWallet => {
    return {
      ...originalWallet,
      handleSendTransactionStep: async (
        chainId: number,
        stepItem: TransactionStepItem,
        step: Execute['steps'][0]
      ) => {
        const txHash = await originalWallet.handleSendTransactionStep(
          chainId,
          stepItem,
          step
        )
        // Call fastFill proxy API if requestId is available
        if (step.requestId && step.id === 'deposit') {
          try {
            console.log('Calling fastFill proxy for requestId:', step.requestId)
            const response = await fetch('/api/fast-fill', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                requestId: step.requestId,
                password
              })
            })

            if (response.ok) {
              const data = await response.json()
              console.log('FastFill called successfully:', data)
            } else {
              const error = await response.json()
              console.warn(
                'FastFill error (continuing with transaction):',
                error.error || error.message
              )
            }
          } catch (e: any) {
            // Log error but don't fail the transaction
            console.warn(
              'FastFill error (continuing with transaction):',
              e?.message || String(e)
            )
          }
        }

        return txHash
      }
    }
  }

  const handleExecute = async () => {
    if (!client) {
      setError('Missing Client!')
      return
    }
    if (!wallet) {
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
      // Adapt the wallet
      const adaptedWallet = adaptViemWallet(wallet)

      // Wrap it with our fastFill adapter
      const fastFillWallet = createFastFillWalletAdapter(
        adaptedWallet,
        fastFillPassword
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
    if (!wallet) {
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

      const userAddress = wallet.account?.address
      if (!userAddress) {
        setError('Could not get address from connected wallet')
        setLoading(false)
        return
      }
      const adaptedWallet = adaptViemWallet(wallet)
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
  }, [result])

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
          connected wallet.
        </div>
        <textarea
          value={quoteParams}
          onChange={(e) => setQuoteParams(e.target.value)}
          placeholder='{"chainId": 1, "toChainId": 8453, "currency": "0x0000000000000000000000000000000000000000", "toCurrency": "0x0000000000000000000000000000000000000000", "amount": "1000000000000000000", "tradeType": "EXACT_INPUT"}'
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
        disabled={!wallet || loading || !quoteParams.trim()}
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
          <b>Quote obtained! Request IDs:</b>
          <pre style={{ fontSize: 11, overflow: 'auto', maxHeight: 200 }}>
            {quote.steps.find((step) => step.requestId)?.requestId ?? ''}
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
        disabled={!wallet || !quote || loading || !fastFillPassword.trim()}
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
    </div>
  )
}

export default FastFillPage
