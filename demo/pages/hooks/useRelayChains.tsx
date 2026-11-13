import { NextPage } from 'next'
import { DemoPage, DemoOutput } from 'components/DemoPage'
import { MAINNET_RELAY_API } from '@relayprotocol/relay-sdk'

import { useRelayChains } from '@relayprotocol/relay-kit-hooks'

const UseRelayChainsPage: NextPage = () => {
  const { data: response } = useRelayChains(MAINNET_RELAY_API)

  return (
    <DemoPage eyebrow="Hook" title="useRelayChains" wide>
      {response?.chains ? (
        <DemoOutput title="Chains" data={response.chains} />
      ) : null}
    </DemoPage>
  )
}

export default UseRelayChainsPage
