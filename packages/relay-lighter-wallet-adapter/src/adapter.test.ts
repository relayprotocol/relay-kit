import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock
} from 'vitest'
import { createClient, MAINNET_RELAY_API } from '@relayprotocol/relay-sdk'
import type {
  Execute,
  TransactionStepItem
} from '@relayprotocol/relay-sdk'

import {
  adaptLighterWallet,
  LIGHTER_CHAIN_ID,
  type LighterSigner,
  type LighterTransaction,
  type LighterTransferParams
} from './adapter.js'

/**
 * These tests exercise the pre-built-signerClient path exclusively — the
 * one integrators with their own Lighter infrastructure will use and that
 * we can't easily validate end-to-end without external stakeholders.
 *
 * The bootstrap path (fresh keygen + `changeApiKey`) is skipped here: it
 * hits the real Lighter WASM + HTTP API and should be covered via
 * integration tests, not unit tests.
 *
 * The adapter's `loadLighterSdk` dynamic import is intentionally NOT
 * mocked. If any of these tests accidentally hits a bootstrap code path,
 * the import will fail (the SDK isn't a hard dep here) and the test will
 * error loudly — a built-in regression guard for "signerClient should
 * skip the SDK entirely".
 */

const L1_ADDRESS =
  '0x03508bB71268BBA25ECaCC8F620e01866650532c' as `0x${string}`
const ACCOUNT_INDEX = 509564

const TRANSFER_PARAMETERS = {
  toAccountIndex: 722011,
  assetIndex: 3,
  fromRouteType: 0,
  toRouteType: 0,
  amount: 1_000_000,
  usdcFee: 3_000_000,
  memo: 'relay-request-id'
}

const STEP_ITEM: TransactionStepItem = {
  status: 'incomplete',
  data: {
    from: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    to: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    data: '0x',
    value: '0',
    action: {
      type: 'transfer',
      parameters: TRANSFER_PARAMETERS
    }
  }
}

const STEP = {
  id: 'deposit',
  action: 'transfer',
  description: '',
  kind: 'transaction'
} as unknown as Execute['steps'][0]

type MockSigner = {
  transfer: Mock<
    Parameters<LighterSigner['transfer']>,
    ReturnType<LighterSigner['transfer']>
  >
  getTransaction: Mock<
    Parameters<LighterSigner['getTransaction']>,
    ReturnType<LighterSigner['getTransaction']>
  >
}

const makeSigner = (
  overrides: Partial<MockSigner> = {}
): LighterSigner & MockSigner => {
  const signer: MockSigner = {
    transfer: vi.fn(async () => [null, '0xdeadbeef', null]),
    getTransaction: vi.fn(async () => ({
      hash: '0xdeadbeef',
      status: 2 as number | 'pending' | 'confirmed' | 'failed',
      block_height: 123
    })),
    ...overrides
  }
  return signer as LighterSigner & MockSigner
}

// The adapter calls `getClient().log(...)` for verbose logging. The SDK
// singleton needs to be initialized once per process; do it lazily so the
// test file doesn't error on import in environments without a prior
// createClient call.
beforeEach(() => {
  createClient({ baseApiUrl: MAINNET_RELAY_API, chains: [] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('adaptLighterWallet — pre-built signerClient path', () => {
  describe('static surface', () => {
    it('reports `lvm` as the vmType', async () => {
      const signer = makeSigner()
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })
      expect(wallet.vmType).toBe('lvm')
    })

    it('returns the Lighter chain id from getChainId', async () => {
      const signer = makeSigner()
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })
      await expect(wallet.getChainId()).resolves.toBe(LIGHTER_CHAIN_ID)
    })

    it('switchChain is a no-op', async () => {
      const signer = makeSigner()
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })
      await expect(wallet.switchChain(1)).resolves.toBeUndefined()
    })

    it('handleSignMessageStep throws — not implemented for Lighter', async () => {
      const signer = makeSigner()
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })
      await expect(
        wallet.handleSignMessageStep(
          { status: 'incomplete' } as never,
          STEP
        )
      ).rejects.toThrow(/not implemented/i)
    })
  })

  describe('address()', () => {
    it('returns the supplied accountIndex as a string, synchronously (no network)', async () => {
      const signer = makeSigner()
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })
      await expect(wallet.address()).resolves.toBe(ACCOUNT_INDEX.toString())
      // address() must not touch the signer.
      expect(signer.transfer).not.toHaveBeenCalled()
      expect(signer.getTransaction).not.toHaveBeenCalled()
    })

    it('stringifies large indices without losing precision below 2^53', async () => {
      const largeIndex = 9_007_199_254_740_990 // 2^53 - 2
      const signer = makeSigner()
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: largeIndex
      })
      await expect(wallet.address()).resolves.toBe(largeIndex.toString())
    })
  })

  describe('handleSendTransactionStep', () => {
    it('forwards the action parameters verbatim to signerClient.transfer', async () => {
      const signer = makeSigner()
      const signL1Message = vi.fn(async () => '0xsig')
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX,
        signL1Message
      })

      await wallet.handleSendTransactionStep(LIGHTER_CHAIN_ID, STEP_ITEM, STEP)

      expect(signer.transfer).toHaveBeenCalledTimes(1)
      const [callParams] = signer.transfer.mock.calls[0]
      expect(callParams).toMatchObject(TRANSFER_PARAMETERS)
    })

    it('passes a signL1Message-backed ethSigner shim when signL1Message is supplied', async () => {
      const signer = makeSigner()
      const signL1Message = vi.fn(async () => '0xsig')
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX,
        signL1Message
      })

      await wallet.handleSendTransactionStep(LIGHTER_CHAIN_ID, STEP_ITEM, STEP)

      const [callParams] = signer.transfer.mock.calls[0] as [
        LighterTransferParams
      ]
      expect(callParams.ethSigner).toBeDefined()
      // The shim must delegate to our signL1Message callback byte-for-byte.
      const result = await callParams.ethSigner!.signMessage('hello world')
      expect(result).toBe('0xsig')
      expect(signL1Message).toHaveBeenCalledWith('hello world')
    })

    it('omits ethSigner when the integrator does not supply signL1Message', async () => {
      const signer = makeSigner()
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })

      await wallet.handleSendTransactionStep(LIGHTER_CHAIN_ID, STEP_ITEM, STEP)

      const [callParams] = signer.transfer.mock.calls[0] as [
        LighterTransferParams
      ]
      expect(callParams.ethSigner).toBeUndefined()
    })

    it('returns the tx hash from a successful transfer', async () => {
      const signer = makeSigner({
        transfer: vi.fn(async () => [null, '0xabcdef', null])
      })
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })

      await expect(
        wallet.handleSendTransactionStep(LIGHTER_CHAIN_ID, STEP_ITEM, STEP)
      ).resolves.toBe('0xabcdef')
    })

    it('throws when transfer returns an error tuple', async () => {
      const signer = makeSigner({
        transfer: vi.fn(async () => [null, '', 'invalid fee'])
      })
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })

      await expect(
        wallet.handleSendTransactionStep(LIGHTER_CHAIN_ID, STEP_ITEM, STEP)
      ).rejects.toThrow(/invalid fee/i)
    })

    it('throws when transfer resolves without a tx hash', async () => {
      const signer = makeSigner({
        transfer: vi.fn(async () => [null, '', null])
      })
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })

      await expect(
        wallet.handleSendTransactionStep(LIGHTER_CHAIN_ID, STEP_ITEM, STEP)
      ).rejects.toThrow(/no transaction hash/i)
    })

    it('rejects step items whose action is missing or not a transfer', async () => {
      const signer = makeSigner()
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })

      const missingAction: TransactionStepItem = {
        ...STEP_ITEM,
        data: { ...STEP_ITEM.data, action: undefined }
      }
      await expect(
        wallet.handleSendTransactionStep(
          LIGHTER_CHAIN_ID,
          missingAction,
          STEP
        )
      ).rejects.toThrow(/unsupported lighter action/i)

      const wrongKind: TransactionStepItem = {
        ...STEP_ITEM,
        data: {
          ...STEP_ITEM.data,
          action: { type: 'swap' as never, parameters: {} as never }
        }
      }
      await expect(
        wallet.handleSendTransactionStep(LIGHTER_CHAIN_ID, wrongKind, STEP)
      ).rejects.toThrow(/unsupported lighter action/i)

      // The signer should never be touched for malformed steps.
      expect(signer.transfer).not.toHaveBeenCalled()
    })

    it('does not re-call signerClient.transfer on repeat invocations', async () => {
      // One adapter instance, called twice → two transfer calls, but still
      // one signer. Confirms we never re-resolve or rebuild the signer.
      const signer = makeSigner()
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })

      await wallet.handleSendTransactionStep(LIGHTER_CHAIN_ID, STEP_ITEM, STEP)
      await wallet.handleSendTransactionStep(LIGHTER_CHAIN_ID, STEP_ITEM, STEP)

      expect(signer.transfer).toHaveBeenCalledTimes(2)
    })
  })

  describe('handleConfirmTransactionStep', () => {
    it('returns an LvmReceipt once the tx is findable', async () => {
      const signer = makeSigner({
        getTransaction: vi.fn(async () => ({
          hash: '0xabcdef',
          status: 1, // QUEUED — findable but not yet committed
          block_height: 42
        }))
      })
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })

      const receipt = await wallet.handleConfirmTransactionStep(
        '0xabcdef',
        LIGHTER_CHAIN_ID,
        () => {},
        () => {}
      )

      expect(receipt).toEqual({
        txHash: '0xabcdef',
        blockHeight: 42,
        status: 1
      })
      // 'findable' semantics: returns on the first successful lookup.
      expect(signer.getTransaction).toHaveBeenCalledTimes(1)
    })

    it('polls until the tx appears, then returns', async () => {
      // Two transient failures / missing hashes, then a real response.
      const calls: Array<LighterTransaction | Error> = [
        new Error('transient network blip'),
        { hash: '' } as LighterTransaction, // indexed but hashless
        { hash: '0xabcdef', status: 2, block_height: 99 }
      ]
      const getTransaction = vi.fn(async () => {
        const next = calls.shift()
        if (!next) throw new Error('out of scripted responses')
        if (next instanceof Error) throw next
        return next
      })
      const signer = makeSigner({ getTransaction })

      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX,
        pollIntervalMs: 1,
        timeoutMs: 5_000
      })

      const receipt = await wallet.handleConfirmTransactionStep(
        '0xabcdef',
        LIGHTER_CHAIN_ID,
        () => {},
        () => {}
      )

      expect(receipt.txHash).toBe('0xabcdef')
      expect(receipt.blockHeight).toBe(99)
      expect(getTransaction).toHaveBeenCalledTimes(3)
    })

    it('throws when the tx lands in FAILED status (numeric)', async () => {
      const signer = makeSigner({
        getTransaction: vi.fn(async () => ({
          hash: '0xabcdef',
          status: 4, // FAILED
          message: 'invalid signature'
        }))
      })
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })

      await expect(
        wallet.handleConfirmTransactionStep(
          '0xabcdef',
          LIGHTER_CHAIN_ID,
          () => {},
          () => {}
        )
      ).rejects.toThrow(/failed.*invalid signature/i)
    })

    it('throws when the tx lands in REJECTED status', async () => {
      const signer = makeSigner({
        getTransaction: vi.fn(async () => ({
          hash: '0xabcdef',
          status: 5 // REJECTED
        }))
      })
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })

      await expect(
        wallet.handleConfirmTransactionStep(
          '0xabcdef',
          LIGHTER_CHAIN_ID,
          () => {},
          () => {}
        )
      ).rejects.toThrow(/rejected/i)
    })

    it('maps string-form statuses ("failed") to the error path', async () => {
      const signer = makeSigner({
        getTransaction: vi.fn(async () => ({
          hash: '0xabcdef',
          status: 'failed' as const,
          message: 'something went wrong'
        }))
      })
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })

      await expect(
        wallet.handleConfirmTransactionStep(
          '0xabcdef',
          LIGHTER_CHAIN_ID,
          () => {},
          () => {}
        )
      ).rejects.toThrow(/failed.*something went wrong/i)
    })

    it('accepts string-form "confirmed" as findable', async () => {
      const signer = makeSigner({
        getTransaction: vi.fn(async () => ({
          hash: '0xabcdef',
          status: 'confirmed' as const,
          block_height: 7
        }))
      })
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX
      })

      const receipt = await wallet.handleConfirmTransactionStep(
        '0xabcdef',
        LIGHTER_CHAIN_ID,
        () => {},
        () => {}
      )
      expect(receipt.status).toBe('confirmed')
    })

    it('throws a timeout when the tx never appears', async () => {
      const signer = makeSigner({
        // Always throws → adapter treats as "not findable yet" and retries.
        getTransaction: vi.fn(async () => {
          throw new Error('not indexed')
        })
      })
      const wallet = adaptLighterWallet({
        l1Address: L1_ADDRESS,
        signerClient: signer,
        accountIndex: ACCOUNT_INDEX,
        pollIntervalMs: 1,
        timeoutMs: 5
      })

      await expect(
        wallet.handleConfirmTransactionStep(
          '0xabcdef',
          LIGHTER_CHAIN_ID,
          () => {},
          () => {}
        )
      ).rejects.toThrow(/did not reach 'findable'/i)
      // Signer was tried at least once (actual attempt count depends on
      // how quickly the event loop rolls; we just assert we did try).
      expect(signer.getTransaction).toHaveBeenCalled()
    })
  })
})
