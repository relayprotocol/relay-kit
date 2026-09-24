import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// Load the client first, as executeSteps.test.ts does, to avoid a circular-import TDZ.
import '../../client'
import type { RelayClient } from '../../client'
import type {
  AdaptedWallet,
  Execute,
  RelayChain,
  SignatureStepItem
} from '../../types'
import { axios } from '../axios'
import { findHyperliquidSendHash } from '../hyperliquid'
import { handleSignatureStepItem } from './signatureStep'

vi.mock('../hyperliquid', () => ({
  postHyperliquidSignature: vi.fn().mockResolvedValue({ status: 'ok' }),
  findHyperliquidSendHash: vi.fn()
}))

const USER = '0x30d0984ab738fe2c06f012803dfaa9e2303455e5'
const SEND_HASH =
  '0xe3a9a4504d4ae51fbf572619c99d8a6eed21cb10f8f6bb72e427b8237c26cba8'
const FILL_HASH =
  '0xa1e843c65f829a5c1905b4245cd85815fcdddf2e52269d391c8329269c260824'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

// A lookup the test settles by hand, so polling or the websocket can land first.
const deferredLookup = () => {
  let resolve: (hash: string | undefined) => void = () => undefined
  vi.mocked(findHyperliquidSendHash).mockImplementation(
    () => new Promise((r) => (resolve = r))
  )
  return (hash: string | undefined) => resolve(hash)
}

const setup = ({
  address = async () => USER,
  websocket = false
}: { address?: () => Promise<string>; websocket?: boolean } = {}) => {
  const stepItem = {
    status: 'incomplete',
    data: {
      sign: {
        signatureKind: 'eip712',
        domain: {},
        types: {},
        primaryType: 'HyperliquidTransaction:SendAsset',
        value: { type: 'sendAsset', nonce: 1767225600123 }
      }
    },
    check: { endpoint: '/intents/status?requestId=0x1', method: 'GET' }
  } as unknown as SignatureStepItem
  const step = {
    id: 'hyperliquid-signature',
    items: [stepItem]
  } as unknown as Execute['steps'][0]
  const params = {
    stepItem,
    step,
    wallet: {
      address,
      handleSignMessageStep: async () => '0x' + '11'.repeat(65)
    } as unknown as AdaptedWallet,
    setState: vi.fn(),
    request: {},
    client: { log: vi.fn() } as unknown as RelayClient,
    json: { steps: [step] } as unknown as Execute,
    maximumAttempts: 1,
    pollingInterval: 0,
    // An open websocket never resolves this; the websocket handlers own the item.
    onWebsocketFailed: websocket ? () => new Promise<void>(() => {}) : null,
    chain: { id: 1337 } as RelayChain
  }
  return { stepItem, params }
}

const pollReturns = (data: Record<string, unknown>) =>
  vi.spyOn(axios, 'request').mockResolvedValue({ status: 200, data } as never)

describe('handleSignatureStepItem (HyperCore)', () => {
  beforeEach(() => {
    vi.mocked(findHyperliquidSendHash).mockReset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Should report the origin pending with its hash once the send lands.', async () => {
    const resolveLookup = deferredLookup()
    const { stepItem, params } = setup({ websocket: true })

    void handleSignatureStepItem(params)
    await flush()
    resolveLookup(SEND_HASH)
    await flush()

    expect(findHyperliquidSendHash).toHaveBeenCalledWith(
      params.client,
      USER,
      stepItem
    )
    // Matches the state Relay's own pending status produces.
    expect(stepItem).toMatchObject({
      internalTxHashes: [{ txHash: SEND_HASH, chainId: 1337 }],
      checkStatus: 'pending',
      progressState: undefined,
      isValidatingSignature: false
    })
  })

  it('Should not hold up status polling while the lookup runs.', async () => {
    deferredLookup()
    const request = pollReturns({
      status: 'success',
      txHashes: [FILL_HASH],
      inTxHashes: [SEND_HASH]
    })
    const { stepItem, params } = setup()

    await handleSignatureStepItem(params)

    expect(request).toHaveBeenCalledOnce()
    expect(stepItem.checkStatus).toBe('success')
  })

  it('Should not report pending after polling has failed.', async () => {
    const resolveLookup = deferredLookup()
    pollReturns({ status: 'failure', details: 'Transaction failed' })
    const { stepItem, params } = setup()

    await expect(handleSignatureStepItem(params)).rejects.toThrow(
      'Transaction failed'
    )
    const updates = params.setState.mock.calls.length
    resolveLookup(SEND_HASH)
    await flush()

    expect(stepItem.checkStatus).toBeUndefined()
    expect(params.setState).toHaveBeenCalledTimes(updates)
  })

  it('Should not overwrite a status the websocket reported during the lookup.', async () => {
    const resolveLookup = deferredLookup()
    const { stepItem, params } = setup({ websocket: true })

    void handleSignatureStepItem(params)
    await flush()
    Object.assign(stepItem, {
      status: 'complete',
      progressState: 'complete',
      checkStatus: 'success'
    })
    resolveLookup(SEND_HASH)
    await flush()

    expect(stepItem).toMatchObject({
      status: 'complete',
      progressState: 'complete',
      checkStatus: 'success'
    })
  })

  it.each([
    ['finds nothing', {}],
    [
      'throws',
      {
        address: async () => {
          throw new Error('wallet disconnected')
        }
      }
    ]
  ])('Should keep validating when the lookup %s.', async (_, options) => {
    const resolveLookup = deferredLookup()
    const { stepItem, params } = setup({ ...options, websocket: true })

    void handleSignatureStepItem(params)
    await flush()
    resolveLookup(undefined)
    await flush()

    expect(stepItem.checkStatus).toBeUndefined()
    expect(stepItem.progressState).toBe('validating')
  })
})
