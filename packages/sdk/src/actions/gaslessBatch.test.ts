import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '../client.js'
import { MAINNET_RELAY_API } from '../constants/index.js'
import { axios } from '../utils/index.js'
import {
  createCaliburExecutor,
  CALIBUR_ORIGIN_GAS_OVERHEAD
} from '../utils/caliburExecutor.js'
import type { BatchExecutorConfig } from '../types/BatchExecutor.js'
import type { Execute } from '../types/Execute.js'
import { zeroAddress, type Address } from 'viem'

// ── helpers ──────────────────────────────────────────────────────────────────

const MOCK_USER = '0x1111111111111111111111111111111111111111' as Address

/** Minimal quote fixture with a single transaction step */
const createMockQuote = (chainId = 8453): Execute =>
  ({
    steps: [
      {
        kind: 'transaction',
        requestId: 'req-abc',
        items: [
          {
            data: {
              to: '0x2222222222222222222222222222222222222222',
              value: '0',
              data: '0xdeadbeef',
              chainId
            }
          }
        ]
      }
    ]
  }) as unknown as Execute

/** Build a mock executor based on Calibur but with overridable fields */
const createMockExecutor = (
  overrides: Partial<BatchExecutorConfig> = {}
): BatchExecutorConfig => {
  const calibur = createCaliburExecutor()
  return {
    ...calibur,
    ...overrides
  }
}

const mockWalletClient = () => ({
  account: { address: MOCK_USER },
  signAuthorization: vi.fn().mockResolvedValue({
    chainId: 8453,
    address: zeroAddress,
    nonce: 0,
    yParity: 0,
    r: '0x' + '00'.repeat(32),
    s: '0x' + '00'.repeat(32)
  }),
  signTypedData: vi.fn().mockResolvedValue('0x' + 'ab'.repeat(65))
})

// ── mocks ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let axiosRequestSpy: any

/**
 * Mock axios so all HTTP calls resolve.
 * – POST /execute  → returns a requestId
 * – GET  /intents/status/v3 → returns success immediately
 */
const mockAxios = () =>
  vi.spyOn(axios, 'request').mockImplementation((config: any) => {
    if (config?.url?.includes('/execute')) {
      return Promise.resolve({
        data: { requestId: 'req-mock-123', message: 'ok' },
        status: 200
      })
    }
    // status polling
    return Promise.resolve({
      data: { status: 'success' },
      status: 200
    })
  })

// Mock viem's createPublicClient to avoid real RPC calls
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...(actual as object),
    createPublicClient: () => ({
      getCode: vi.fn().mockResolvedValue('0x'),
      getTransactionCount: vi.fn().mockResolvedValue(0),
      readContract: vi.fn().mockResolvedValue(0n)
    })
  }
})

/** Extract the request body sent to /execute from the axios spy calls */
const getExecuteBody = (): Record<string, any> => {
  const call = axiosRequestSpy.mock.calls.find((c: any) =>
    (c[0] as any)?.url?.includes('/execute')
  )
  if (!call) throw new Error('No /execute call found')
  return (call[0] as any).data as Record<string, any>
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('executeGaslessBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    axiosRequestSpy = mockAxios()
  })

  // ---------- basic validation ----------

  it('should throw when client has no API url', async () => {
    createClient({ baseApiUrl: '' })

    const { executeGaslessBatch } = await import('./gaslessBatch.js')

    await expect(
      executeGaslessBatch({
        quote: createMockQuote(),
        walletClient: mockWalletClient() as any
      })
    ).rejects.toThrow('RelayClient missing api url configuration')
  })

  it('should throw when client has no API key', async () => {
    createClient({ baseApiUrl: MAINNET_RELAY_API })

    const { executeGaslessBatch } = await import('./gaslessBatch.js')

    await expect(
      executeGaslessBatch({
        quote: createMockQuote(),
        walletClient: mockWalletClient() as any
      })
    ).rejects.toThrow('API key is required')
  })

  it('should throw when walletClient has no account', async () => {
    createClient({ baseApiUrl: MAINNET_RELAY_API, apiKey: 'test-key' })

    const { executeGaslessBatch } = await import('./gaslessBatch.js')

    await expect(
      executeGaslessBatch({
        quote: createMockQuote(),
        walletClient: {} as any
      })
    ).rejects.toThrow('WalletClient must have an account')
  })

  // ---------- originGasOverhead: default (Calibur) ----------

  it('should include Calibur default originGasOverhead (80k) in /execute body', async () => {
    createClient({ baseApiUrl: MAINNET_RELAY_API, apiKey: 'test-key' })

    const { executeGaslessBatch } = await import('./gaslessBatch.js')

    await executeGaslessBatch({
      quote: createMockQuote(),
      walletClient: mockWalletClient() as any
    })

    const body = getExecuteBody()
    expect(body.originGasOverhead).toBe(CALIBUR_ORIGIN_GAS_OVERHEAD)
    expect(body.originGasOverhead).toBe(80_000)
  })

  // ---------- originGasOverhead: custom executor ----------

  it('should use custom executor originGasOverhead when provided', async () => {
    createClient({ baseApiUrl: MAINNET_RELAY_API, apiKey: 'test-key' })

    const { executeGaslessBatch } = await import('./gaslessBatch.js')

    const customExecutor = createMockExecutor({ originGasOverhead: 120_000 })

    await executeGaslessBatch({
      quote: createMockQuote(),
      walletClient: mockWalletClient() as any,
      executor: customExecutor
    })

    const body = getExecuteBody()
    expect(body.originGasOverhead).toBe(120_000)
  })

  // ---------- originGasOverhead: explicit override ----------

  it('should let originGasOverhead parameter override the executor default', async () => {
    createClient({ baseApiUrl: MAINNET_RELAY_API, apiKey: 'test-key' })

    const { executeGaslessBatch } = await import('./gaslessBatch.js')

    await executeGaslessBatch({
      quote: createMockQuote(),
      walletClient: mockWalletClient() as any,
      originGasOverhead: 200_000
    })

    const body = getExecuteBody()
    expect(body.originGasOverhead).toBe(200_000)
  })

  it('should let originGasOverhead parameter override a custom executor default', async () => {
    createClient({ baseApiUrl: MAINNET_RELAY_API, apiKey: 'test-key' })

    const { executeGaslessBatch } = await import('./gaslessBatch.js')

    const customExecutor = createMockExecutor({ originGasOverhead: 120_000 })

    await executeGaslessBatch({
      quote: createMockQuote(),
      walletClient: mockWalletClient() as any,
      executor: customExecutor,
      originGasOverhead: 50_000
    })

    const body = getExecuteBody()
    expect(body.originGasOverhead).toBe(50_000)
  })

  // ---------- originGasOverhead: executor with no default ----------

  it('should omit originGasOverhead when executor has none and no override given', async () => {
    createClient({ baseApiUrl: MAINNET_RELAY_API, apiKey: 'test-key' })

    const { executeGaslessBatch } = await import('./gaslessBatch.js')

    const executorWithoutGas = createMockExecutor({
      originGasOverhead: undefined
    })

    await executeGaslessBatch({
      quote: createMockQuote(),
      walletClient: mockWalletClient() as any,
      executor: executorWithoutGas
    })

    const body = getExecuteBody()
    expect(body).not.toHaveProperty('originGasOverhead')
  })
})
