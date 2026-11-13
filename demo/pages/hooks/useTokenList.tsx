import { NextPage } from 'next'
import { DemoPage, DemoOutput } from 'components/DemoPage'
import { MAINNET_RELAY_API } from '@relayprotocol/relay-sdk'

import { useTokenList } from '@relayprotocol/relay-kit-hooks'
import { useState } from 'react'

const UseRequests: NextPage = () => {
  const [chainIds, setChainIds] = useState<number[] | undefined>(undefined)
  const [defaultList, setDefaultList] = useState<boolean>(false)
  const [term, setTerm] = useState<string>('')
  const [address, setAddress] = useState<string | undefined>()
  const [currencyId, setCurrencyId] = useState<string | undefined>()
  const [tokens, setTokens] = useState<string[] | undefined>(undefined)
  const [verified, setVerified] = useState<boolean>(false)
  const [limit, setLimit] = useState<number>(20)
  const { data: response } = useTokenList(MAINNET_RELAY_API, {
    chainIds,
    defaultList,
    term,
    address,
    currencyId,
    tokens,
    verified,
    limit
  })

  return (
    <DemoPage eyebrow="Hook" title="useTokenList">
      <div className="demo-panel">
        <div>
          <label>Term</label>
          <input
            type="string"
            placeholder="The search term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <div>
          <label>Address</label>
          <input
            type="string"
            placeholder="User address to search by"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <label>CurrencyId</label>
          <input
            type="string"
            placeholder="Search by currency id"
            value={currencyId}
            onChange={(e) => setCurrencyId(e.target.value)}
          />
        </div>
        <div>
          <label>Tokens</label>
          <input
            type="string"
            placeholder="Tokens to search by, delimited by a comma"
            value={tokens?.join(',')}
            onChange={(e) =>
              setTokens(
                e.target.value && e.target.value.length > 0
                  ? e.target.value.split(',')
                  : undefined
              )
            }
          />
        </div>
        <div>
          <label>ChainIds</label>
          <input
            type="string"
            placeholder="ChainIds to filter by"
            value={chainIds?.join(',')}
            onChange={(e) =>
              setChainIds(
                e.target.value && e.target.value.length > 0
                  ? e.target.value.split(',').map((id) => +id)
                  : undefined
              )
            }
          />
        </div>
        <div>
          <label>Verified</label>
          <input
            type="checkbox"
            placeholder="Return only verified results"
            checked={verified}
            onChange={(e) => setVerified(e.target.checked ? true : false)}
          />
        </div>
        <div>
          <label>DefaultList</label>
          <input
            type="checkbox"
            placeholder="Return the default list"
            checked={defaultList}
            onChange={(e) => setDefaultList(e.target.checked ? true : false)}
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
      </div>
      {response ? <DemoOutput title="Response" data={response} /> : null}
    </DemoPage>
  )
}

export default UseRequests
