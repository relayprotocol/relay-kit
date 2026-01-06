import { NextPage } from 'next'
import { useState } from 'react'
import { useWalletClient } from 'wagmi'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { ConnectButton } from 'components/ConnectButton'

const ClaimAppFeesPage: NextPage = () => {
  const { data: wallet } = useWalletClient()
  const client = useRelayClient()
  const [chainId, setChainId] = useState<number>(1)
  const [currency, setCurrency] = useState<string>(
    '0x0000000000000000000000000000000000000000'
  )
  const [recipient, setRecipient] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [progress, setProgress] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: 24,
        paddingTop: 150
      }}
    >
      <ConnectButton />
      <div>
        <label>Chain Id: </label>
        <input
          value={chainId}
          onChange={(e) => setChainId(Number(e.target.value))}
          style={{ minWidth: 100 }}
        />
      </div>
      <div>
        <label>Currency: </label>
        <input
          type="text"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          style={{ minWidth: 100 }}
        />
      </div>
      <div>
        <label>Recipient: </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          style={{ minWidth: 350 }}
        />
      </div>
      <div>
        <label>Amount: </label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ minWidth: 100 }}
          placeholder="Optional"
        />
      </div>
      <button
        style={{
          marginTop: 20,
          padding: 16,
          background: 'blue',
          color: 'white',
          fontSize: 16,
          border: '1px solid #ffffff',
          borderRadius: 8,
          fontWeight: 700,
          cursor: 'pointer'
        }}
        disabled={!wallet || !chainId || !currency || loading}
        onClick={async () => {
          setError(null)
          setResult(null)
          setProgress(null)
          setLoading(true)
          try {
            if (!client) throw new Error('Missing Client!')
            if (!wallet) throw new Error('Connect your wallet!')
            const claim = await client.actions.claimAppFees({
              wallet,
              chainId,
              currency,
              recipient,
              amount: amount || undefined,
              onProgress: setProgress
            })
            setResult(claim.data)
          } catch (e: any) {
            setError(e?.message || String(e))
          } finally {
            setLoading(false)
          }
        }}
      >
        {loading ? 'Claiming...' : 'Claim App Fees'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {progress && (
        <div
          style={{
            marginTop: 20,
            padding: '10px',
            background: '#f0f0f0',
            borderRadius: '8px',
            width: '100%',
            maxWidth: 1000
          }}
        >
          <b>Progress:</b>
          <pre>{JSON.stringify(progress, null, 2)}</pre>
        </div>
      )}
      {result && (
        <div
          style={{
            marginTop: 20,
            padding: '10px',
            background: '#e0ffe0',
            borderRadius: '8px',
            width: '100%',
            maxWidth: 1000
          }}
        >
          <b>Result:</b>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default ClaimAppFeesPage
