import { NextPage } from 'next'
import { DemoPage, DemoOutput } from 'components/DemoPage'
import { useState } from 'react'
import { useWalletClient } from 'wagmi'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'

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
    <DemoPage eyebrow="SDK write action" title="Claim App Fees">
      <div className="demo-panel">
        <div>
          <label>Chain Id</label>
          <input
            value={chainId}
            onChange={(e) => setChainId(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Currency</label>
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
        <div>
          <label>Recipient</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>
        <div>
          <label>Amount</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <button
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
        {error && <div className="demo-error">{error}</div>}
      </div>
      {progress && <DemoOutput title="Progress" data={progress} />}
      {result && <DemoOutput title="Result" data={result} />}
    </DemoPage>
  )
}

export default ClaimAppFeesPage
