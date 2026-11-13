import { NextPage } from 'next'
import { DemoPage, DemoOutput } from 'components/DemoPage'
import { useState } from 'react'
import { useWalletClient } from 'wagmi'
import { base, baseGoerli, sepolia, zora } from 'viem/chains'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { zeroAddress } from 'viem'

const CallActionPage: NextPage = () => {
  const [txs, setTxs] = useState<string[]>([])
  const [tx, setTx] = useState<string>('')
  const [toChainId, setToChainId] = useState<number>(zora.id)
  const [fromChainId, setFromChainId] = useState<number>(base.id)
  const [depositGasLimit, setDepositGasLimit] = useState('')
  const { data: wallet } = useWalletClient()
  const client = useRelayClient()

  return (
    <DemoPage eyebrow="SDK write action" title="Call">
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
        <div>
          <label>Deposit Gas Limit</label>
          <input
            type="number"
            value={depositGasLimit}
            onChange={(e) => setDepositGasLimit(e.target.value)}
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
            if (!wallet) {
              throw 'Please connect to execute transactions'
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

            if (!quote) {
              throw 'Missing quote!'
            }

            client?.actions.execute({
              wallet,
              quote,
              depositGasLimit,
              onProgress: (data) => {
                console.log(data)
              }
            })
          }}
        >
          Execute Transactions
        </button>
      </div>
    </DemoPage>
  )
}

export default CallActionPage
