import { NextPage } from 'next'
import { DemoPage, DemoOutput } from 'components/DemoPage'

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
    <DemoPage eyebrow="Hook" title="useRequests">
      <div className="demo-panel">
        <div>
          <label>Origin Chain Id</label>
          <input
            type="number"
            placeholder="Which origin chain?"
            value={originChainId}
            onChange={(e) => setOriginChainId(+e.target.value)}
          />
        </div>
        <div>
          <label>Destination Chain Id</label>
          <input
            type="number"
            placeholder="Which destination chain?"
            value={destinationChainId}
            onChange={(e) => setDestinationChainId(+e.target.value)}
          />
        </div>
        <div>
          <label>Limit</label>
          <input
            type="number"
            placeholder="How many maximum requests per page?"
            value={limit}
            onChange={(e) => setLimit(+e.target.value)}
          />
        </div>
        <div>
          <label>User</label>
          <input
            type="string"
            placeholder="User address?"
            value={user}
            onChange={(e) => setUser(e.target.value)}
          />
        </div>
      </div>
      {response ? <DemoOutput title="Response" data={response} /> : null}
    </DemoPage>
  )
}

export default UseRequests
