import { NextPage } from 'next'
import { DemoPage, DemoOutput } from 'components/DemoPage'
import { useState } from 'react'
import { useWalletClient } from 'wagmi'
import { base, zora } from 'viem/chains'
import { Address, zeroAddress } from 'viem'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'

const BridgeActionPage: NextPage = () => {
  const [recipient, setRecipient] = useState<string | undefined>()
  const [amount, setAmount] = useState<string>('')
  const [currency, setCurrency] = useState<string>(zeroAddress)
  const [usePermit, setUsePermit] = useState(false)
  const [canonical, setCanonical] = useState(false)
  const [useExactInput, setUseExactInput] = useState(false)
  const [toChainId, setToChainId] = useState<number>(zora.id)
  const [fromChainId, setFromChainId] = useState<number>(base.id)
  const [depositGasLimit, setDepositGasLimit] = useState('')
  const { data: wallet } = useWalletClient()
  const client = useRelayClient()

  return (
    <DemoPage eyebrow="SDK write action" title="Bridge">
      <div className="demo-panel">
        <div>
          <label>To Chain Id</label>
          <input
            type="number"
            placeholder="Which chain to bridge to?"
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
          <label>Amount</label>
          <input
            type="number"
            placeholder="How much to bridge?"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <div>
            <label>Currency</label>
            <input
              type="string"
              placeholder="What currency to bridge?"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label>Use Permit</label>
          <input
            type="checkbox"
            checked={usePermit}
            onChange={(e) => {
              setUsePermit(e.target.checked)
            }}
          />
        </div>

        <div>
          <label>Canonical</label>
          <input
            type="checkbox"
            checked={canonical}
            onChange={(e) => {
              setCanonical(e.target.checked)
            }}
          />
        </div>

        <div>
          <label>Use Exact Input</label>
          <input
            type="checkbox"
            checked={useExactInput}
            onChange={(e) => {
              setUseExactInput(e.target.checked)
            }}
          />
        </div>

        <div>
          <label>Recipient</label>
          <input
            placeholder="Who is the receiver?"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
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
          onClick={async () => {
            if (!wallet) {
              throw 'Please connect to execute transactions'
            }

            if (!amount) {
              throw 'Must include an amount for bridging'
            }

            const quote = await client?.actions.getQuote(
              {
                chainId: fromChainId,
                wallet,
                toChainId,
                amount,
                currency,
                toCurrency: currency,
                recipient: recipient ? (recipient as Address) : undefined,
                tradeType: useExactInput ? 'EXACT_INPUT' : 'EXPECTED_OUTPUT',
                options: {
                  usePermit: usePermit,
                  useExternalLiquidity: canonical
                }
              },
              true
            )

            if (!quote) {
              throw 'Missing a quote'
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
          Execute Bridge
        </button>
      </div>
    </DemoPage>
  )
}

export default BridgeActionPage
