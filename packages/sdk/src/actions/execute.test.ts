import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RelayClient, createClient } from '../client'
import { http, zeroAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { MAINNET_RELAY_API } from '../constants'
import { executeBridge } from '../../tests/data/executeBridge'
import type { AdaptedWallet, Execute } from '../types'
import { evmDeadAddress } from '../constants/address'
import { axios } from '../utils'

let client: RelayClient | undefined
let wallet: AdaptedWallet = {
  getChainId: () => Promise.resolve(1),
  transport: http(mainnet.rpcUrls.default.http[0]),
  address: () => Promise.resolve(zeroAddress),
  handleSignMessageStep: vi.fn().mockResolvedValue('0x'),
  handleSendTransactionStep: vi.fn().mockResolvedValue('0x'),
  handleConfirmTransactionStep: vi.fn().mockResolvedValue('0x'),
  switchChain: vi.fn().mockResolvedValue(undefined),
  vmType: 'evm'
}
let quote = executeBridge
let executeStepsSpy = vi
  .fn()
  .mockImplementation(
    (
      chainId: any,
      request: any,
      wallet: any,
      progress: any,
      clonedQuote: Execute,
      options?: any
    ) => {
      delete clonedQuote.details?.currencyIn
      return Promise.resolve(clonedQuote)
    }
  )
vi.mock('../utils/executeSteps/index.js', () => {
  return {
    executeSteps: (...args: any[]) => {
      return executeStepsSpy(...args)
    }
  }
})

describe('Should test the execute action.', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetAllMocks()
    executeStepsSpy.mockImplementation(
      (
        chainId: any,
        request: any,
        wallet: any,
        progress: any,
        clonedQuote: Execute,
        options?: any
      ) => {
        delete clonedQuote.details?.currencyIn
        return Promise.resolve(clonedQuote)
      }
    )
    quote = JSON.parse(JSON.stringify(executeBridge))
  })

  it("Should throw 'RelayClient missing api url configuration'.", () => {
    client = createClient({
      baseApiUrl: ''
    })

    expect(() =>
      client?.actions?.execute({
        wallet,
        quote
      })
    ).toThrow('RelayClient missing api url configuration')
  })

  it('Should require passing in a wallet', () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API
    })

    expect(() =>
      //@ts-ignore
      client?.actions?.execute({
        quote
      })
    ).toThrow('AdaptedWallet is required to execute steps')
  })

  it('Should allow passing in additional txs', () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API
    })

    delete quote.details?.currencyIn?.currency?.chainId

    expect(() =>
      //@ts-ignore
      client?.actions?.execute({
        wallet,
        quote
      })
    ).toThrow('Missing chainId from quote')
  })

  it('Should clone the quote', async () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API
    })
    const originalCurrencyInDetails = JSON.parse(
      JSON.stringify(quote.details?.currencyIn)
    )

    await client?.actions?.execute({
      wallet,
      quote
    })
    expect(quote.details?.currencyIn).toEqual(originalCurrencyInDetails)
    expect(executeStepsSpy).toHaveBeenCalled()
  })

  it('Should pass the correct values to the executeSteps function', async () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API
    })

    await client?.actions?.execute({
      wallet,
      quote
    })

    const lastCallArgs = executeStepsSpy.mock.lastCall
    expect(lastCallArgs).toBeDefined()

    expect(lastCallArgs[0]).toBe(quote.details?.currencyIn?.currency?.chainId)
    expect(lastCallArgs[1]).toBe(quote.request)
    expect(lastCallArgs[2]).toBe(wallet)
    expect(typeof lastCallArgs[3]).toBe('function')

    const clonedQuoteInSpy = lastCallArgs[4] as Execute
    expect(clonedQuoteInSpy.details?.currencyIn).toBeUndefined()
    expect(clonedQuoteInSpy.details?.recipient).toBe(quote.details?.recipient)

    expect(lastCallArgs[5]).toBeUndefined()
  })

  it('Should throw an error when sender is dead address', () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API
    })
    if (quote.details?.sender) {
      quote.details.sender = evmDeadAddress
    }
    expect(() =>
      client?.actions?.execute({
        wallet,
        quote
      })
    ).toThrow('Sender should never be burn address')
  })

  it('Should throw an error when recipient is dead address', () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API
    })
    if (quote.details?.sender) {
      quote.details.recipient = evmDeadAddress
    }
    expect(() =>
      client?.actions?.execute({
        wallet,
        quote
      })
    ).toThrow('Recipient should never be burn address')
  })

  it('Should emit settled metadata through onProgress and onTransactionReceived', async () => {
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API
    })

    const onProgress = vi.fn()
    const onTransactionReceived = vi.fn()
    const settledAmount = '1002000000000000'

    executeStepsSpy.mockImplementation(
      (
        chainId: any,
        request: any,
        wallet: any,
        progress: any,
        clonedQuote: Execute,
        options?: any
      ) => {
        progress({
          steps: clonedQuote.steps,
          fees: clonedQuote.fees,
          breakdown: clonedQuote.breakdown,
          details: clonedQuote.details
        })
        return Promise.resolve(clonedQuote)
      }
    )

    const axiosRequestSpy = vi.spyOn(axios, 'request').mockResolvedValue({
      data: {
        requests: [
          {
            id: '0xabc',
            data: {
              metadata: {
                currencyOut: {
                  ...quote.details?.currencyOut,
                  amount: settledAmount,
                  amountFormatted: '0.001002'
                }
              }
            }
          }
        ]
      }
    } as any)

    await client?.actions?.execute({
      wallet,
      quote,
      onProgress,
      onTransactionReceived
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(onTransactionReceived).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '0xabc'
      })
    )
    expect(onProgress).toHaveBeenCalled()
    expect(onProgress.mock.calls.at(-1)?.[0]?.details?.currencyOut?.amount).toBe(
      settledAmount
    )

    axiosRequestSpy.mockRestore()
  })
})
