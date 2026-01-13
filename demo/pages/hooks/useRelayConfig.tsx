import { NextPage } from 'next'
import { useState } from 'react'
import { MAINNET_RELAY_API } from '@relayprotocol/relay-sdk'

import { useRelayConfig } from '@relayprotocol/relay-kit-hooks'
import { useConnection } from 'wagmi'
import { ConnectButton } from 'components/ConnectButton'

const UseRelayConfigPage: NextPage = () => {
  const { address } = useConnection()
  const [toChainId, setToChainId] = useState<string>('1')
  const [fromChainId, setFromChainId] = useState<string>('8453')
  const [currency, setCurrency] = useState<string>('eth')

  const { data: quote, error } = useRelayConfig(MAINNET_RELAY_API, {
    originChainId: fromChainId,
    destinationChainId: toChainId,
    user: address,
    currency: currency as any
  })

  return (
    <div
      style={{
        display: 'flex',
        height: 50,
        width: '100%',
        gap: 12,
        padding: 24,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 150
      }}
    >
      <ConnectButton />
      <div>
        <label>To Chain Id: </label>
        <input
          type="number"
          placeholder="Which chain to interact with?"
          value={toChainId}
          onChange={(e) => setToChainId(e.target.value)}
        />
      </div>
      <div>
        <label>From Chain Id: </label>
        <input
          type="number"
          placeholder="Which chain to deposit on?"
          value={fromChainId}
          onChange={(e) => setFromChainId(e.target.value)}
        />
      </div>
      <div>
        <label>Currency: </label>
        <input
          type="text"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />
      </div>

      {quote && (
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
          <pre>{JSON.stringify(quote, null, 2)}</pre>
        </div>
      )}

      {error && <p>{error?.message}</p>}
    </div>
  )
}

export default UseRelayConfigPage
