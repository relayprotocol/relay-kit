import { NextPage } from 'next'
import { DemoPage, DemoOutput } from 'components/DemoPage'
import { useState } from 'react'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'

const GetAppFeesPage: NextPage = () => {
  const [wallet, setWallet] = useState('')
  const [balances, setBalances] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const client = useRelayClient()

  return (
    <DemoPage eyebrow="SDK read action" title="getAppFees">
      <div className="demo-panel">
        <div>
          <label>Wallet Address</label>
          <input
            type="text"
            placeholder="Enter wallet address"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            style={{ minWidth: 350, padding: 8 }}
          />
        </div>
        <button
          disabled={!wallet || loading}
          onClick={async () => {
            setError(null)
            setBalances(null)
            setLoading(true)
            try {
              if (!client) throw new Error('Missing Client!')
              const result = await client.actions.getAppFees({ wallet })
              setBalances(result)
            } catch (e: any) {
              setError(e?.message || String(e))
            } finally {
              setLoading(false)
            }
          }}
        >
          {loading ? 'Loading...' : 'Get App Fees'}
        </button>
        {error && <div className="demo-error">{error}</div>}
      </div>
      {balances && <DemoOutput title="Response" data={balances} />}
    </DemoPage>
  )
}

export default GetAppFeesPage
