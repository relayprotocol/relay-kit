import { NextPage } from 'next'
import { DemoPage, DemoOutput } from 'components/DemoPage'
import { useState } from 'react'
import { Execute } from '@relayprotocol/relay-sdk'
import { useWalletClient } from 'wagmi'
import { base, baseGoerli, sepolia, zora } from 'viem/chains'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { zeroAddress } from 'viem'

const GetCallQuotePage: NextPage = () => {
  const [txs, setTxs] = useState<string[]>([])
  const [tx, setTx] = useState<string>('')
  const [toChainId, setToChainId] = useState<number>(zora.id)
  const [fromChainId, setFromChainId] = useState<number>(base.id)
  const { data: wallet } = useWalletClient()
  const [response, setResponse] = useState<Execute | null>(null)
  const client = useRelayClient()

  return (
    <DemoPage eyebrow="SDK read action" title="getCallQuote">
      <div className="demo-panel">
        <div>
          <label>To Chain Id</label>
          <input
            type="number"
            placeholder="Which chain to interact with?"
            value={toChainId}
            onChange={(e) => setToChainId(Number(e.target.value))}
          />
        </div>
        <div>
          <label>From Chain Id</label>
          <input
            type="number"
            placeholder="Which chain to deposit on?"
            value={fromChainId}
            onChange={(e) => setFromChainId(Number(e.target.value))}
          />
        </div>
        <div>
          <label>Transaction</label>
          <textarea
            placeholder='Add a transaction object, must be valid json: {to: "", data: "", value: ""}'
            value={tx}
            onChange={(e) => setTx(e.target.value)}
          />
        </div>
        <button
          className="demo-button-secondary"
          disabled={!tx}
          onClick={() => {
            setTxs([...txs, JSON.parse(`${tx}`)])
          }}
        >
          Add Transaction
        </button>
        <div>
          <label>Txs added</label>
          <pre className="demo-output">
            {txs.map((tx) => JSON.stringify(tx)).join('\n') || 'None yet'}
          </pre>
        </div>
        <button
          onClick={async () => {
            if (!client) {
              throw 'Missing Client!'
            }
            const quote = await client?.actions.getQuote(
              {
                chainId: fromChainId,
                wallet, // optional
                txs: txs as any,
                toChainId,
                currency: zeroAddress,
                toCurrency: zeroAddress,
                tradeType: 'EXACT_OUTPUT'
              },
              true
            )

            setResponse(quote)
          }}
        >
          Get Call Quote
        </button>
      </div>
      {response && <DemoOutput title="Response" data={response} />}
    </DemoPage>
  )
}

export default GetCallQuotePage
