import { NextPage } from 'next'
import { useEffect, useState } from 'react'
import { Address } from 'viem'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { ConnectButton } from 'components/ConnectButton'
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
import { adaptSuiWallet } from '@relayprotocol/relay-sui-wallet-adapter'
import { isBitcoinWallet } from '@dynamic-labs/bitcoin'
import { isSuiWallet } from '@dynamic-labs/sui'

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
    <div
      style={{
        display: 'flex',
        height: 50,
        gap: 12,
        padding: 24,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 150
      }}
    >
      <ConnectButton />
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 12,
          width: 'calc(100% - 48px)'
        }}
      >
        <div
          style={{
            height: '100%',
            width: '50%',
            borderRight: '1px solid #000000'
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <div
              style={{
                marginBottom: 14,
                fontWeight: tab === 'logs' ? 600 : 400,
                cursor: 'pointer'
              }}
              onClick={() => setTab('logs')}
            >
              Logs
            </div>
            <div
              style={{
                marginBottom: 14,
                fontWeight: tab === 'quote' ? 600 : 400,
                cursor: 'pointer'
              }}
              onClick={() => setTab('quote')}
            >
              Quote
            </div>
          </div>
          {error && <div style={{ color: 'red' }}>{error}</div>}
          {tab === 'logs' && (
            <div
              style={{
                overflowY: 'scroll',
                maxHeight: 'calc(100vh - 224px)',
                wordWrap: 'break-word',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}
            >
              {logs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    background: '#D7DBFF',
                    borderRadius: '4px',
                    padding: '4px 8px'
                  }}
                >
                  {log.message}
                </div>
              ))}
            </div>
          )}
          {tab === 'quote' && (
            <div
              style={{
                overflowY: 'scroll',
                maxHeight: 'calc(100vh - 224px)',
                wordWrap: 'break-word',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}
            >
              <pre>{JSON.stringify(quote, null, 2)}</pre>
            </div>
          )}
        </div>
        <div
          style={{
            width: '50%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '0 8px 0 8px'
          }}
        >
          <div>Paste in the quote JSON parameters below:</div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 200,
              fontStyle: 'italic',
              marginTop: 4,
              marginBottom: 14
            }}
          >
            Note that user is not required as that is taken from the connected
            wallet
          </div>
          <textarea
            style={{ minHeight: 400, minWidth: 500 }}
            value={jsonPayload}
            onChange={(e) => setJsonPayload(e.target.value)}
          />
          <div>Paste in headers JSON parameters below (optional):</div>
          <textarea
            style={{ minHeight: 200, minWidth: 500 }}
            value={headersPayload}
            onChange={(e) => setHeadersPayload(e.target.value)}
          />
          <button
            style={{
              marginTop: 50,
              padding: 24,
              background: 'blue',
              color: 'white',
              fontSize: 18,
              border: '1px solid #ffffff',
              borderRadius: 8,
              fontWeight: 800,
              cursor: 'pointer'
            }}
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
              } else if (isSuiWallet(primaryWallet)) {
                const walletClient = await primaryWallet.getWalletClient()

                if (!walletClient) {
                  throw 'Unable to setup Sui wallet'
                }

                executionWallet = adaptSuiWallet(
                  primaryWallet?.address,
                  quoteParams.originChainId,
                  walletClient,
                  async (tx) => {
                    const signedTransaction =
                      await primaryWallet.signTransaction(tx)

                    const executionResult =
                      await walletClient?.executeTransactionBlock({
                        options: {},
                        signature: signedTransaction.signature,
                        transactionBlock: signedTransaction.bytes
                      })

                    return executionResult
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
        </div>
      </div>
    </div>
  )
}

export default SwapActionPage
