import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '../client'
import { MAINNET_RELAY_API } from '../constants'
import { axios } from '../utils'
import { zeroAddress } from 'viem'

/**
 * Verifies that the x-api-key header is included in requests
 * when apiKey is configured in createClient.
 */

let axiosRequestSpy: ReturnType<typeof mockAxiosRequest>

const mockAxiosRequest = () => {
  return vi.spyOn(axios, 'request').mockImplementation(() => {
    return Promise.resolve({
      data: { status: 'success', balances: [], steps: [] },
      status: 200
    })
  })
}

const mockWallet = {
  vmType: 'evm' as const,
  getChainId: () => Promise.resolve(1),
  address: () => Promise.resolve(zeroAddress),
  handleSignMessageStep: vi.fn().mockResolvedValue('0x'),
  handleSendTransactionStep: vi.fn().mockResolvedValue('0x'),
  handleConfirmTransactionStep: vi
    .fn()
    .mockResolvedValue({ status: 'success' }),
  switchChain: vi.fn().mockResolvedValue(undefined)
}

describe('API Key Header Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetAllMocks()
    axiosRequestSpy = mockAxiosRequest()
  })

  it('Should include x-api-key header in getQuote when apiKey is configured', async () => {
    const client = createClient({
      baseApiUrl: MAINNET_RELAY_API,
      apiKey: 'test-api-key'
    })

    await client.actions.getQuote(
      {
        toChainId: 1,
        chainId: 8453,
        currency: '0x0000000000000000000000000000000000000000',
        toCurrency: '0x0000000000000000000000000000000000000000',
        tradeType: 'EXACT_INPUT',
        amount: '1000000000000000'
      },
      true
    )

    expect(axiosRequestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/quote'),
        headers: expect.objectContaining({
          'x-api-key': 'test-api-key'
        })
      })
    )
  })

  it('Should include x-api-key header in getAppFees when apiKey is configured', async () => {
    const client = createClient({
      baseApiUrl: MAINNET_RELAY_API,
      apiKey: 'test-api-key'
    })

    await client.actions.getAppFees({
      wallet: '0x0000000000000000000000000000000000000000'
    })

    expect(axiosRequestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/app-fees/'),
        headers: expect.objectContaining({
          'x-api-key': 'test-api-key'
        })
      })
    )
  })

  it('Should include x-api-key header in claimAppFees when apiKey is configured', async () => {
    const client = createClient({
      baseApiUrl: MAINNET_RELAY_API,
      apiKey: 'test-api-key'
    })

    try {
      await client.actions.claimAppFees({
        wallet: mockWallet,
        chainId: 1,
        currency: '0x0000000000000000000000000000000000000000'
      })
    } catch {}

    expect(axiosRequestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/claim'),
        headers: expect.objectContaining({
          'x-api-key': 'test-api-key'
        })
      })
    )
  })
})
