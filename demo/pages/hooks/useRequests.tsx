import { NextPage } from 'next'

import { useRequests } from '@relayprotocol/relay-kit-hooks'
import { useState } from 'react'

const UseRequests: NextPage = () => {
  const [originChainId, setOriginChainId] = useState<number | undefined>(
    undefined
  )
  const [destinationChainId, setDestinationChainId] = useState<
    number | undefined
  >(undefined)
  const [limit, setLimit] = useState<number>(20)
  const [user, setUser] = useState<string | undefined>()
  const { data: response } = useRequests(
    {
      originChainId,
      destinationChainId,
      limit,
      user
    },
    // Routes through the demo's server-side proxy so the required x-api-key is
    // injected. See pages/api/relay/[...path].ts.
    '/api/relay/mainnets'
  )

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
      <div
        style={{
          marginTop: 20,
          padding: '10px',
          background: '#f0f0f0',
          borderRadius: '8px',
          marginLeft: '12px',
          marginRight: '12p',
          wordBreak: 'break-word'
        }}
      >
        <div>
          <label>Origin Chain Id: </label>
          <input
            type="number"
            placeholder="Which origin chain?"
            value={originChainId}
            onChange={(e) => setOriginChainId(+e.target.value)}
          />
        </div>
        <div>
          <label>Destination Chain Id: </label>
          <input
            type="number"
            placeholder="Which destination chain?"
            value={destinationChainId}
            onChange={(e) => setDestinationChainId(+e.target.value)}
          />
        </div>
        <div>
          <label>Limit: </label>
          <input
            type="number"
            placeholder="How many maximum requests per page?"
            value={limit}
            onChange={(e) => setLimit(+e.target.value)}
          />
        </div>
        <div>
          <label>User: </label>
          <input
            type="string"
            placeholder="User address?"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
        </div>
        {JSON.stringify(response)}
      </div>
    </div>
  )
}

export default UseRequests
