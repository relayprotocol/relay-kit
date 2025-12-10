import { describe, it, expect, beforeEach } from 'vitest'
import {
  RelayClient,
  configureDynamicChains,
  createClient,
  getClient
} from './client.js'
import {
  MAINNET_RELAY_API,
  TESTNET_RELAY_API,
  convertViemChainToRelayChain
} from './index.js'
import { base } from 'viem/chains'

let client: RelayClient

describe('Should test the client.', () => {
  beforeEach(() => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API
    })
  })

  it('Should confirm client is configured properly.', async () => {
    expect(client).toEqual(
      expect.objectContaining({
        baseApiUrl: MAINNET_RELAY_API,
        source: undefined,
        logLevel: 0,
        pollingInterval: undefined,
        maxPollingAttemptsBeforeTimeout: undefined,
        chains: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            name: 'Ethereum',
            displayName: 'Ethereum',
            wsRpcUrl: '',
            explorerUrl: 'https://etherscan.io',
            depositEnabled: true
          }),
          expect.objectContaining({
            id: 8453,
            name: 'Base',
            displayName: 'Base',
            httpRpcUrl: 'https://mainnet.base.org',
            wsRpcUrl: '',
            explorerUrl: 'https://basescan.org',
            depositEnabled: true
          }),
          expect.objectContaining({
            id: 7777777,
            name: 'Zora',
            displayName: 'Zora',
            httpRpcUrl: 'https://rpc.zora.energy',
            wsRpcUrl: 'wss://rpc.zora.energy',
            explorerUrl: 'https://explorer.zora.energy',
            depositEnabled: true
          }),
          expect.objectContaining({
            id: 10,
            name: 'OP-Mainnet',
            displayName: 'OP Mainnet',
            httpRpcUrl: 'https://mainnet.optimism.io',
            wsRpcUrl: '',
            explorerUrl: 'https://optimistic.etherscan.io',
            depositEnabled: true
          }),
          expect.objectContaining({
            id: 42161,
            name: 'Arbitrum-One',
            displayName: 'Arbitrum One',
            httpRpcUrl: 'https://arb1.arbitrum.io/rpc',
            wsRpcUrl: '',
            explorerUrl: 'https://arbiscan.io',
            depositEnabled: true
          }),
          expect.objectContaining({
            id: 42170,
            name: 'Arbitrum-Nova',
            displayName: 'Arbitrum Nova',
            httpRpcUrl: 'https://nova.arbitrum.io/rpc',
            wsRpcUrl: '',
            explorerUrl: 'https://nova.arbiscan.io',
            depositEnabled: true
          })
        ]),
        actions: expect.objectContaining({
          execute: expect.anything(),
          getQuote: expect.anything()
        })
      })
    )
  })

  it('Should confirm getClient returns the client correctly.', async () => {
    expect(getClient()).toEqual(
      expect.objectContaining({
        baseApiUrl: MAINNET_RELAY_API,
        source: undefined,
        logLevel: 0,
        pollingInterval: undefined,
        maxPollingAttemptsBeforeTimeout: undefined,
        chains: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            name: 'Ethereum',
            displayName: 'Ethereum',
            wsRpcUrl: '',
            explorerUrl: 'https://etherscan.io',
            depositEnabled: true
          }),
          expect.objectContaining({
            id: 8453,
            name: 'Base',
            displayName: 'Base',
            httpRpcUrl: 'https://mainnet.base.org',
            wsRpcUrl: '',
            explorerUrl: 'https://basescan.org',
            depositEnabled: true
          }),
          expect.objectContaining({
            id: 7777777,
            name: 'Zora',
            displayName: 'Zora',
            httpRpcUrl: 'https://rpc.zora.energy',
            wsRpcUrl: 'wss://rpc.zora.energy',
            explorerUrl: 'https://explorer.zora.energy',
            depositEnabled: true
          }),
          expect.objectContaining({
            id: 10,
            name: 'OP-Mainnet',
            displayName: 'OP Mainnet',
            httpRpcUrl: 'https://mainnet.optimism.io',
            wsRpcUrl: '',
            explorerUrl: 'https://optimistic.etherscan.io',
            depositEnabled: true
          }),
          expect.objectContaining({
            id: 42161,
            name: 'Arbitrum-One',
            displayName: 'Arbitrum One',
            httpRpcUrl: 'https://arb1.arbitrum.io/rpc',
            wsRpcUrl: '',
            explorerUrl: 'https://arbiscan.io',
            depositEnabled: true
          }),
          expect.objectContaining({
            id: 42170,
            name: 'Arbitrum-Nova',
            displayName: 'Arbitrum Nova',
            httpRpcUrl: 'https://nova.arbitrum.io/rpc',
            wsRpcUrl: '',
            explorerUrl: 'https://nova.arbiscan.io',
            depositEnabled: true
          })
        ]),
        actions: expect.objectContaining({
          execute: expect.anything(),
          getQuote: expect.anything()
        })
      })
    )
  })

  it('Should set the baseApiUrl to use the testnet api', async () => {
    client = createClient({
      baseApiUrl: TESTNET_RELAY_API
    })

    expect(client.baseApiUrl).toEqual('https://api.testnets.relay.link')
  })

  it('Should configure the chains passed into createClient correctly', async () => {
    client = createClient({
      chains: [convertViemChainToRelayChain(base)]
    })

    expect(client).toEqual(
      expect.objectContaining({
        baseApiUrl: MAINNET_RELAY_API,
        source: undefined,
        logLevel: 0,
        pollingInterval: undefined,
        maxPollingAttemptsBeforeTimeout: undefined,
        chains: expect.arrayContaining([
          expect.objectContaining({
            id: 8453,
            name: 'Base',
            displayName: 'Base',
            httpRpcUrl: 'https://mainnet.base.org',
            wsRpcUrl: '',
            explorerUrl: 'https://basescan.org',
            depositEnabled: true
          })
        ])
      })
    )

    expect(client.chains).toHaveLength(1)
  })

  it('Should configure chains dynamically', async () => {
    client = createClient({})
    await configureDynamicChains()

    expect(client.chains.length).toBeGreaterThan(6)
  })

  it('Should configure a source', async () => {
    client = createClient({
      source: 'test.com'
    })

    expect(client.source).toEqual('test.com')
  })
})
