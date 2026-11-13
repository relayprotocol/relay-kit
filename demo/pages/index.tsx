import { DemoPage } from 'components/DemoPage'
import { NextPage } from 'next'
import Link from 'next/link'

const SECTIONS = [
  {
    title: 'UI',
    links: [
      { href: '/ui/swap', label: 'SwapWidget' },
      { href: '/ui/chain', label: 'ChainWidget' },
      { href: '/ui/onramp', label: 'OnrampWidget' },
      { href: '/ui/depositAddresses', label: 'Deposit Addresses' }
    ]
  },
  {
    title: 'SDK Write Actions',
    links: [
      { href: '/sdk/actions/call', label: 'Call' },
      { href: '/sdk/actions/bridge', label: 'Bridge' },
      { href: '/sdk/actions/swap', label: 'Swap' },
      { href: '/sdk/actions/claimAppFees', label: 'Claim App Fees' },
      { href: '/sdk/actions/fastFill', label: 'Fast Fill' }
    ]
  },
  {
    title: 'SDK Read Actions',
    links: [
      { href: '/sdk/actions/getSolverCapacity', label: 'getSolverCapacity' },
      { href: '/sdk/actions/getCallQuote', label: 'getCallQuote' },
      { href: '/sdk/actions/getBridgeQuote', label: 'getBridgeQuote' },
      { href: '/sdk/actions/getSwapQuote', label: 'getSwapQuote' },
      { href: '/sdk/actions/getAppFees', label: 'getAppFees' }
    ]
  },
  {
    title: 'Hooks',
    links: [
      { href: '/hooks/useRelayChains', label: 'useRelayChains' },
      { href: '/hooks/useRequests', label: 'useRequests' },
      { href: '/hooks/useTokenList', label: 'useTokenList' }
    ]
  }
]

const Index: NextPage = () => {
  return (
    <DemoPage
      eyebrow="Relay Kit"
      title="Demo playground"
      description="Try the UI widgets, SDK actions and hooks against the Relay API."
      wide
    >
      {SECTIONS.map((section) => (
        <section key={section.title} className="demo-panel">
          <h2>{section.title}</h2>
          <nav className="demo-links">
            {section.links.map((link) => (
              <Link key={link.href} href={link.href} className="demo-link">
                {link.label}
              </Link>
            ))}
          </nav>
        </section>
      ))}
    </DemoPage>
  )
}

export default Index
