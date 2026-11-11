import { describe, it, expect, vi, beforeEach } from 'vitest'
import { base } from 'viem/chains'
import { createClient } from '../client'
import { MAINNET_RELAY_API } from '../constants'
import { axios } from '../utils'
import { convertViemChainToRelayChain } from '../utils/chain'
import type { Order, OrderStep } from '../types'

const ORDER_ID = 'order_id_1'
const USER = '0xAbC0000000000000000000000000000000000001'

const approveStep: OrderStep = {
  id: 'approve',
  action: 'Approve Permit2',
  description: 'Approve Permit2 to spend the token',
  kind: 'transaction',
  status: 'incomplete',
  data: {
    from: USER,
    to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    data: '0x095ea7b3',
    value: '0',
    chainId: base.id
  }
}

const authorizeStep: OrderStep = {
  id: 'authorize',
  action: 'Sign the order',
  description: 'Sign the order',
  kind: 'signature',
  status: 'incomplete',
  data: {
    sign: {
      signatureKind: 'eip712',
      domain: { name: 'Permit2', chainId: base.id },
      types: {},
      primaryType: 'PermitWitnessTransferFrom',
      value: {}
    },
    post: {
      endpoint: `/orders/${ORDER_ID}/signature`,
      method: 'POST',
      body: { kind: 'permit2', requestId: '0x01' }
    }
  }
}

const cancelStep: OrderStep = {
  id: 'cancel',
  action: "Invalidate the order's permit",
  description: 'Burns the Permit2 nonce',
  kind: 'transaction',
  status: 'incomplete',
  data: {
    from: USER,
    to: '0x000000000022d473030f116ddee9f6b43ac78ba3',
    data: '0x3ff9dcb1',
    value: '0',
    chainId: base.id
  }
}

const order = (fields: Partial<Order>) =>
  ({
    id: ORDER_ID,
    status: 'pending',
    outcome: null,
    originChainId: base.id,
    steps: [],
    ...fields
  }) as Order

const mockWallet = () => ({
  vmType: 'evm' as const,
  getChainId: vi.fn().mockResolvedValue(base.id),
  address: vi.fn().mockResolvedValue(USER),
  handleSignMessageStep: vi.fn().mockResolvedValue('0xsignature'),
  handleSendTransactionStep: vi.fn().mockResolvedValue('0xtxhash'),
  handleConfirmTransactionStep: vi.fn().mockResolvedValue({
    status: 'success'
  }),
  switchChain: vi.fn()
})

const mockApi = (responses: Record<string, unknown>) =>
  vi.spyOn(axios, 'request').mockImplementation((config) => {
    const path = new URL(config.url!).pathname
    const data = responses[`${config.method?.toUpperCase()} ${path}`]
    if (!data) {
      return Promise.reject(new Error(`Unexpected request ${path}`))
    }
    return Promise.resolve({ data, status: 200 })
  })

const relayCalls = (spy: ReturnType<typeof mockApi>) =>
  spy.mock.calls.map(([config]) => ({
    method: config.method,
    path: new URL(config.url!).pathname,
    data: config.data,
    params: config.params,
    headers: config.headers
  }))

describe('Limit order actions', () => {
  let client: ReturnType<typeof createClient>

  beforeEach(() => {
    vi.restoreAllMocks()
    client = createClient({
      baseApiUrl: MAINNET_RELAY_API,
      apiKey: 'test-api-key',
      chains: [convertViemChainToRelayChain(base)]
    })
  })

  it('creates an order, sends its approval, then posts its signature', async () => {
    const opened = order({ status: 'open' })
    const api = mockApi({
      'POST /orders': {
        order: order({ steps: [approveStep, authorizeStep] })
      },
      [`POST /orders/${ORDER_ID}/signature`]: { order: opened },
      'GET /orders': { orders: [opened] }
    })
    const wallet = mockWallet()
    const progress: string[][] = []

    const result = await client.actions.createOrder({
      order: {
        type: 'limit',
        user: USER,
        side: 'sell',
        targetCurrency: '0x4200000000000000000000000000000000000006',
        targetChainId: base.id,
        settlementCurrency: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        settlementChainId: base.id,
        targetPrice: '4000',
        amount: '1000000000000000000',
        expiresAt: '2099-01-01T00:00:00Z'
      },
      idempotencyKey: 'retry-1',
      wallet,
      onProgress: ({ steps }) =>
        progress.push(steps.map((step) => step.items[0].status))
    })

    expect(result).toEqual(opened)
    expect(wallet.handleSendTransactionStep).toHaveBeenCalledWith(
      base.id,
      expect.objectContaining({ data: approveStep.data }),
      expect.objectContaining({ id: 'approve' })
    )
    expect(
      wallet.handleSendTransactionStep.mock.invocationCallOrder[0]
    ).toBeLessThan(wallet.handleSignMessageStep.mock.invocationCallOrder[0])
    expect(wallet.handleSignMessageStep).toHaveBeenCalledWith(
      expect.objectContaining({ data: authorizeStep.data }),
      expect.objectContaining({ id: 'authorize' })
    )

    const calls = relayCalls(api)
    expect(calls.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'post /orders',
      `POST /orders/${ORDER_ID}/signature`,
      'get /orders'
    ])
    expect(calls[0].headers).toMatchObject({
      'Idempotency-Key': 'retry-1',
      'x-api-key': 'test-api-key'
    })
    expect(calls[1].params).toEqual({ signature: '0xsignature' })
    expect(JSON.parse(calls[1].data)).toMatchObject(
      authorizeStep.data.post.body
    )
    expect(calls[2].params).toEqual({ orderId: ORDER_ID })
    expect(progress[0]).toEqual(['incomplete', 'incomplete'])
    expect(progress.at(-1)).toEqual(['complete', 'complete'])
  })

  it('returns the pending order with its steps when no wallet is given', async () => {
    const pending = order({ steps: [authorizeStep] })
    const api = mockApi({ 'POST /orders': { order: pending } })

    const result = await client.actions.createOrder({
      order: {} as any
    })

    expect(result).toBe(pending)
    expect(api).toHaveBeenCalledTimes(1)
    expect(relayCalls(api)[0].headers).not.toHaveProperty('Idempotency-Key')
  })

  it('lists orders with comma-separated statuses', async () => {
    const api = mockApi({ 'GET /orders': { orders: [], continuation: 'c1' } })

    const result = await client.actions.getOrders({
      user: USER,
      status: ['open', 'processing'],
      limit: 10
    })

    expect(result).toEqual({ orders: [], continuation: 'c1' })
    expect(relayCalls(api)[0].params).toEqual({
      user: USER,
      status: 'open,processing',
      limit: 10
    })
  })

  it('soft cancels by default and sends no transaction', async () => {
    const cancelled = order({ status: 'closed', outcome: 'cancelled' })
    const api = mockApi({
      [`POST /orders/${ORDER_ID}/cancel`]: { order: cancelled }
    })
    const wallet = mockWallet()

    const result = await client.actions.cancelOrder({
      orderId: ORDER_ID,
      wallet
    })

    expect(result).toBe(cancelled)
    expect(JSON.parse(JSON.stringify(relayCalls(api)[0].data))).toEqual({})
    expect(wallet.handleSendTransactionStep).not.toHaveBeenCalled()
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('sends the permit invalidation of an onchain cancel', async () => {
    const cancelled = order({
      status: 'closed',
      outcome: 'cancelled',
      steps: [cancelStep]
    })
    const api = mockApi({
      [`POST /orders/${ORDER_ID}/cancel`]: { order: cancelled },
      'GET /orders': { orders: [cancelled] }
    })
    const wallet = mockWallet()

    await client.actions.cancelOrder({
      orderId: ORDER_ID,
      onchain: true,
      wallet
    })

    expect(relayCalls(api)[0].data).toEqual({ onchain: true })
    expect(wallet.handleSendTransactionStep).toHaveBeenCalledWith(
      base.id,
      expect.objectContaining({ data: cancelStep.data }),
      expect.objectContaining({ id: 'cancel' })
    )
    expect(wallet.handleSignMessageStep).not.toHaveBeenCalled()
  })
})
