import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RelayClient, createClient } from '../client'
import { convertViemChainToRelayChain } from '../utils/chain'
import { http, zeroAddress } from 'viem'
import { AxiosError } from 'axios'
import {
  mainnet,
  base,
  zora,
  optimism,
  arbitrum,
  arbitrumNova
} from 'viem/chains'
import { MAINNET_RELAY_API } from '../constants'
import { xrpDeadAddress } from '../constants/address'
import { axios } from '../utils'
import type { RelayChain } from '../types'

const viemChains = [mainnet, base, zora, optimism, arbitrum, arbitrumNova]
const xrpChain: RelayChain = {
  id: 537724,
  name: 'xrp',
  displayName: 'XRP Ledger',
  vmType: 'xrpvm',
  currency: {
    id: 'xrp',
    symbol: 'XRP',
    name: 'XRP',
    address: 'xrp',
    decimals: 6
  }
}
const relayChains = [...viemChains.map(convertViemChainToRelayChain), xrpChain]

let client: RelayClient | undefined
let wallet = {
  getChainId: () => Promise.resolve(1),
  transport: http(mainnet.rpcUrls.default.http[0]),
  address: () => Promise.resolve(zeroAddress),
  handleSignMessageStep: vi.fn().mockResolvedValue('0x'),
  handleSendTransactionStep: vi.fn().mockResolvedValue('0x')
}

let axiosRequestSpy: ReturnType<typeof mockAxiosRequest>

const mockAxiosRequest = () => {
  return vi.spyOn(axios, 'request').mockImplementation((config) => {
    return Promise.resolve({
      data: { status: 'success' },
      status: 200
    })
  })
}

describe('Should test the getQuote action.', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetAllMocks()
    axiosRequestSpy = mockAxiosRequest()
  })

  it("Should throw 'RelayClient missing api url configuration'.", async () => {
    client = createClient({
      baseApiUrl: '',
      chains: relayChains
    })

    await expect(
      client?.actions?.getQuote(
        {
          wallet,
          toChainId: 1,
          chainId: 8453,
          currency: '0x0000000000000000000000000000000000000000',
          toCurrency: '0x0000000000000000000000000000000000000000',
          tradeType: 'EXACT_INPUT',
          amount: '1000000000000000' // 0.001 ETH
        },
        true
      )
    ).rejects.toThrow('RelayClient missing api url configuration')
  })

  it('Should allow not passing in a wallet', async () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API,
      chains: relayChains
    })

    await client?.actions?.getQuote(
      {
        toChainId: 1,
        chainId: 8453,
        currency: '0x0000000000000000000000000000000000000000',
        toCurrency: '0x0000000000000000000000000000000000000000',
        tradeType: 'EXACT_INPUT',
        amount: '1000000000000000' // 0.001 ETH
      },
      true
    )

    expect(axiosRequestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('quote'),
        data: expect.objectContaining({
          user: '0x000000000000000000000000000000000000dead',
          destinationCurrency: '0x0000000000000000000000000000000000000000',
          destinationChainId: 1,
          originCurrency: '0x0000000000000000000000000000000000000000',
          originChainId: 8453,
          amount: '1000000000000000',
          recipient: '0x000000000000000000000000000000000000dead',
          tradeType: 'EXACT_INPUT'
        })
      })
    )
  })

  it('Should keep the user passed in when there is no wallet', async () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API,
      chains: relayChains
    })

    const user = '0x1111111111111111111111111111111111111111'

    await client?.actions?.getQuote(
      {
        user,
        toChainId: 1,
        chainId: 8453,
        currency: '0x0000000000000000000000000000000000000000',
        toCurrency: '0x0000000000000000000000000000000000000000',
        tradeType: 'EXACT_INPUT',
        amount: '1000000000000000' // 0.001 ETH
      },
      true
    )

    expect(axiosRequestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('quote'),
        data: expect.objectContaining({
          user,
          recipient: '0x000000000000000000000000000000000000dead'
        })
      })
    )
  })

  it('Should allow passing in additional txs', async () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API,
      chains: relayChains
    })

    await client?.actions?.getQuote(
      {
        toChainId: 1,
        chainId: 8453,
        currency: '0x0000000000000000000000000000000000000000',
        toCurrency: '0x0000000000000000000000000000000000000000',
        tradeType: 'EXACT_INPUT',
        amount: '1000000000000000', // 0.001 ETH
        txs: [
          {
            data: '0x',
            value: '0',
            to: '0x'
          }
        ]
      },
      true
    )

    expect(axiosRequestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('quote'),
        data: expect.objectContaining({
          user: '0x000000000000000000000000000000000000dead',
          destinationCurrency: '0x0000000000000000000000000000000000000000',
          destinationChainId: 1,
          originCurrency: '0x0000000000000000000000000000000000000000',
          originChainId: 8453,
          amount: '1000000000000000',
          recipient: '0x000000000000000000000000000000000000dead',
          tradeType: 'EXACT_INPUT',
          txs: [{ data: '0x', value: '0', to: '0x' }]
        })
      })
    )
  })

  it('Should return the /quote/v3 response with its flat steps', async () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API,
      chains: relayChains
    })
    const fee = { usd: '-0.02', amount: '5000', amountFormatted: '0.000005' }
    const response = {
      requestId: '0x92b9',
      steps: [
        {
          id: 'deposit',
          action: 'Confirm transaction in your wallet',
          description: 'Depositing funds',
          kind: 'transaction',
          depositAddress: {
            address: '0xdeposit',
            type: 'open',
            depositor: null,
            depositTxHash: null,
            recoveryAddress: null
          },
          status: 'incomplete',
          data: { to: '0xa5f5', data: '0x', value: '1', chainId: 8453 },
          check: {
            endpoint: '/intents/status/v3?requestId=0x92b9',
            method: 'GET'
          }
        }
      ],
      fees: {
        execution: fee,
        swap: fee,
        platform: fee,
        app: fee,
        sponsored: fee,
        currency: { chainId: 8453, address: zeroAddress, decimals: 18 }
      },
      originGas: { amount: '21000', amountUsd: '0.00007' },
      details: { operation: 'bridge', rate: '1' }
    }
    axiosRequestSpy.mockResolvedValueOnce({ status: 200, data: response })

    const { request, ...quote } = await client.actions.getQuote(
      {
        toChainId: 1,
        chainId: 8453,
        currency: zeroAddress,
        toCurrency: zeroAddress,
        tradeType: 'EXACT_INPUT',
        amount: '1'
      },
      true
    )

    expect(request?.url).toBe(`${MAINNET_RELAY_API}/quote/v3`)
    expect(quote).toEqual(response)
  })

  it('Should report the HTTP status of a /quote/v3 error', async () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API,
      chains: relayChains
    })
    axiosRequestSpy.mockRestore()
    const adapter = axios.defaults.adapter
    axios.defaults.adapter = (config) =>
      Promise.reject(
        new AxiosError('Request failed', '401', config, null, {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
          data: {
            message: 'Unauthorized: Check API Key or API session',
            errorCode: 'UNAUTHORIZED_QUOTE'
          }
        })
      )

    try {
      await expect(
        client.actions.getQuote(
          {
            toChainId: 1,
            chainId: 8453,
            currency: zeroAddress,
            toCurrency: zeroAddress,
            tradeType: 'EXACT_INPUT',
            amount: '1'
          },
          true
        )
      ).rejects.toMatchObject({
        statusCode: 401,
        rawError: { errorCode: 'UNAUTHORIZED_QUOTE' }
      })
    } finally {
      axios.defaults.adapter = adapter
    }
  })

  it('Should use the XRP dead address as the default recipient for XRP destinations', async () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API,
      chains: relayChains
    })

    await client?.actions?.getQuote(
      {
        toChainId: 537724,
        chainId: 8453,
        currency: '0x0000000000000000000000000000000000000000',
        toCurrency: 'xrp',
        tradeType: 'EXACT_INPUT',
        amount: '1000000000000000' // 0.001 ETH
      },
      true
    )

    expect(axiosRequestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('quote'),
        data: expect.objectContaining({
          // Origin is still EVM, so the user stays the EVM dead address
          user: '0x000000000000000000000000000000000000dead',
          destinationChainId: 537724,
          recipient: xrpDeadAddress
        })
      })
    )
  })
})
