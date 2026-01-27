import { Layout } from 'components/Layout'
import { NextPage } from 'next'
import Link from 'next/link'

const Index: NextPage = () => {
  return (
    <Layout>
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          gap: 12,
          padding: 24,
          flexDirection: 'column',
          alignItems: 'flex-start'
        }}
      >
        <h2>
          <b>UI</b>
        </h2>
        <nav style={{ display: 'flex', gap: 15 }}>
          <Link href="/ui/swap">SwapWidget</Link>
          <Link href="/ui/token">TokenWidget</Link>
          <Link href="/ui/chain">ChainWidget</Link>
          <Link href="/ui/onramp">OnrampWidget</Link>
          <Link href="/ui/depositAddresses">Deposit Addresses</Link>
        </nav>
        <h2>
          <b>SDK Write Actions</b>
        </h2>
        <nav style={{ display: 'flex', gap: 15 }}>
          <Link href="/sdk/actions/call">Call</Link>
          <Link href="/sdk/actions/bridge">Bridge</Link>
          <Link href="/sdk/actions/swap">Swap</Link>
          <Link href="/sdk/actions/claimAppFees">Claim App Fees</Link>
          <Link href="/sdk/actions/fastFill">Fast Fill</Link>
        </nav>
        <h2>
          <b>SDK Read Actions</b>
        </h2>
        <nav style={{ display: 'flex', gap: 15 }}>
          <Link href="/sdk/actions/getSolverCapacity">getSolverCapacity</Link>
          <Link href="/sdk/actions/getCallQuote">getCallQuote</Link>
          <Link href="/sdk/actions/getBridgeQuote">getBridgeQuote</Link>
          <Link href="/sdk/actions/getSwapQuote">getSwapQuote</Link>
          <Link href="/sdk/actions/getAppFees">getAppFees</Link>
        </nav>
        <h2>
          <b>Hooks</b>
        </h2>
        <nav style={{ display: 'flex', gap: 15 }}>
          <Link href="/hooks/useRelayConfig">useRelayConfig</Link>
          <Link href="/hooks/useRelayChains">useRelayChains</Link>
          <Link href="/hooks/useRequests">useRequests</Link>
          <Link href="/hooks/useTokenList">useTokenList</Link>
        </nav>
      </div>
    </Layout>
  )
}

export default Index
