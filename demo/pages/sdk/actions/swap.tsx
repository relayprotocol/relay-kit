import { NextPage } from 'next'
import { useEffect, useState } from 'react'
import { Address } from 'viem'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { isSolanaWallet } from '@dynamic-labs/solana'
import { adaptSolanaWallet } from '@relayprotocol/relay-svm-wallet-adapter'
import { adaptBitcoinWallet } from '@relayprotocol/relay-bitcoin-wallet-adapter'
import {
  adaptViemWallet,
  Execute,
  GetQuoteParameters,
  LogLevel
} from '@relayprotocol/relay-sdk'
import {
  adaptLighterWallet,
  LIGHTER_CHAIN_ID
} from '@relayprotocol/relay-lighter-wallet-adapter'
import { isBitcoinWallet } from '@dynamic-labs/bitcoin'
import { DemoPage } from 'components/DemoPage'

const SwapActionPage: NextPage = () => {
  const client = useRelayClient()

  const { primaryWallet: primaryWallet } = useDynamicContext()
  const [jsonPayload, setJsonPayload] = useState<any>()
  const [headersPayload, setHeadersPayload] = useState<any>()
  const [error, setError] = useState<string | undefined>()
  const [logs, setLogs] = useState<{ message: string[]; level: LogLevel }[]>([])
  const [quote, setQuote] = useState<Execute | undefined>()
  const [tab, setTab] = useState<'logs' | 'quote'>('logs')

  useEffect(() => {
    const handler = (
      e: CustomEvent<{ message: string[]; level: LogLevel }>
    ) => {
      setLogs((prevLogs) => [
        ...prevLogs,
        {
          message: e.detail.message.map((message) => JSON.stringify(message)),
          level: e.detail.level
        }
      ])
    }

    window.addEventListener('relay-kit-logger', handler as any)

    return () => {
      window.removeEventListener('relay-kit-logger', handler as any)
    }
  }, [])

  return (
    <DemoPage eyebrow="SDK write action" title="Swap" wide>
      <div className="demo-columns">
        <section className="demo-panel">
          <div className="demo-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'logs'}
              onClick={() => setTab('logs')}
            >
              Logs
            </button>
            <button
              role="tab"
              aria-selected={tab === 'quote'}
              onClick={() => setTab('quote')}
            >
              Quote
            </button>
          </div>
          {error && <div className="demo-error">{error}</div>}
          {tab === 'logs' && (
            <div className="demo-output">
              {logs.length
                ? logs.map((log, i) => <div key={i}>{log.message}</div>)
                : 'No logs yet'}
            </div>
          )}
          {tab === 'quote' && (
            <pre className="demo-output">{JSON.stringify(quote, null, 2)}</pre>
          )}
        </section>
        <section className="demo-panel">
          <div>
            <label>Quote parameters (JSON)</label>
            <div className="demo-hint">
              Note that user is not required as that is taken from the connected
              wallet
            </div>
            <textarea
              style={{ minHeight: 320 }}
              value={jsonPayload}
              onChange={(e) => setJsonPayload(e.target.value)}
            />
          </div>
          <div>
            <label>Headers (JSON, optional)</label>
            <textarea
              value={headersPayload}
              onChange={(e) => setHeadersPayload(e.target.value)}
            />
          </div>
          <button
            onClick={async () => {
              setError(undefined)
              setLogs([])
              setQuote(undefined)
              if (!primaryWallet) {
                setError('Please connect to execute transactions')
                throw 'Please connect to execute transactions'
              }
              let quoteParams: any | undefined

              try {
                quoteParams = JSON.parse(jsonPayload)
              } catch (e) {
                setError(`Invalid JSON payload: ${e}`)
                throw 'Invalid JSON payload'
              }

              if (!quoteParams) {
                setError('Missing JSON payload')
                throw 'Missing JSON payload'
              }

              console.log(quoteParams, 'PARAMS')

              if (!quoteParams.originChainId) {
                setError('Missing chainId')
                throw 'Missing chainId'
              }

              let executionWallet

              if (
                quoteParams.originChainId === 792703809 &&
                isSolanaWallet(primaryWallet)
              ) {
                const connection = await primaryWallet.getConnection()
                const signer = await primaryWallet.getSigner()

                if (!connection || !signer?.signTransaction) {
                  throw 'Unable to setup Solana wallet'
                }

                executionWallet = adaptSolanaWallet(
                  primaryWallet.address,
                  792703809,
                  connection,
                  signer.signAndSendTransaction
                )
              } else if (
                quoteParams.originChainId === LIGHTER_CHAIN_ID &&
                isEthereumWallet(primaryWallet)
              ) {
                // Lighter is account-based and needs a per-session API key.
                // The adapter handles the full lifecycle internally — the
                // user sees a `changeApiKey` signature prompt on the first
                // swap, then transfers sign normally.
                //
                // `apiUrl: '/api/lighter'` routes all Lighter API traffic
                // through our server-side proxy (`pages/api/lighter/[...path]`)
                const walletClient = await primaryWallet.getWalletClient()
                const account = walletClient.account
                if (!account) throw 'Missing EVM account for Lighter adapter'
                executionWallet = adaptLighterWallet({
                  l1Address: account.address,
                  signL1Message: (message) =>
                    walletClient.signMessage({ account, message }),
                  apiUrl: '/api/lighter'
                })
              } else if (isEthereumWallet(primaryWallet)) {
                const walletClient = await primaryWallet.getWalletClient()
                executionWallet = adaptViemWallet(walletClient)
              } else if (isBitcoinWallet(primaryWallet)) {
                executionWallet = adaptBitcoinWallet(
                  primaryWallet.address,
                  async (_address, _psbt, dynamicParams) => {
                    try {
                      // Request the wallet to sign the PSBT
                      const response =
                        await primaryWallet.signPsbt(dynamicParams)
                      if (!response) {
                        throw 'Missing psbt response'
                      }
                      return response.signedPsbt
                    } catch (e) {
                      throw e
                    }
                  }
                )
              } else {
                throw 'Unable to configure wallet'
              }

              const {
                destinationCurrency,
                destinationChainId,
                originCurrency,
                originChainId,
                amount,
                tradeType,
                referrer,
                ...options
              } = quoteParams

              const quote = await client?.actions.getQuote(
                {
                  wallet: executionWallet,
                  user: primaryWallet.address,
                  recipient: primaryWallet.address,
                  toCurrency: destinationCurrency,
                  toChainId: destinationChainId,
                  currency: originCurrency,
                  chainId: originChainId,
                  amount,
                  tradeType,
                  options: {
                    ...options,
                    referrer: referrer
                  }
                },
                true,
                headersPayload ? JSON.parse(headersPayload) : undefined
              )

              setQuote(quote)
              if (!quote) {
                throw 'Missing the quote'
              }
              client?.actions
                .execute({
                  quote,
                  wallet: executionWallet,
                  onProgress: (data) => {
                    console.log(data)
                  }
                })
                .catch((e) => {
                  setError(`Error executing swap: ${e}`)
                  throw e
                })
            }}
          >
            Execute Swap
          </button>
        </section>
      </div>
    </DemoPage>
  )
}

export default SwapActionPage
