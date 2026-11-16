import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createClient,
  getClient,
  MAINNET_RELAY_API
} from '@relayprotocol/relay-sdk'
import type { Execute, TransactionStepItem } from '@relayprotocol/relay-sdk'
import { adaptXrpWallet } from './adapter.js'

const WALLET = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
const RPC_URL = 'https://xrpl.example'

// Deposit step from a recorded /quote/v2 response (10 XRP -> USDC on Base).
const STEP = {
  id: 'deposit',
  action: 'Confirm transaction in your wallet',
  description: 'Depositing funds to the relayer to execute the swap for USDC',
  kind: 'transaction',
  requestId:
    '0x17946040203a8ba398b6455f39833cb470310b3a3a2737547e216048e1600185',
  depositAddress: '',
  items: [
    {
      status: 'incomplete',
      data: {
        to: 'rJBdWA9p5KwBoqSQTyMdg3UHLsJVzGVu5m',
        currency: 'xrp',
        amount: '10000000',
        memo: '0x2300242a72d8c2f4a2bd2b314c7447a63837678ed2dc3dc8d4187c330f664a03'
      },
      check: {
        endpoint:
          '/intents/status/v3?requestId=0x17946040203a8ba398b6455f39833cb470310b3a3a2737547e216048e1600185',
        method: 'GET'
      }
    }
  ]
} as unknown as Execute['steps'][0]
const STEP_ITEM = STEP.items[0] as unknown as TransactionStepItem

const TX_HASH =
  '09443F247CAFEA7CA3767F2D7915CDDCCB373010AA1D4A2AE8F48A8C3829E800'

// Recorded XRPL `tx` responses (trimmed).
const NOT_FOUND = {
  result: { error: 'txnNotFound', error_code: 29, status: 'error' }
}
const TOO_BUSY = {
  result: { error: 'tooBusy', error_code: 9, status: 'error' }
}
const PENDING = {
  result: { hash: TX_HASH, validated: false, status: 'success' }
}
const validated = (TransactionResult: string) => ({
  result: {
    hash: TX_HASH,
    validated: true,
    ledger_index: 108311165,
    meta: { TransactionResult },
    status: 'success'
  }
})

const fetchMock = vi.fn()
const respond = (...bodies: unknown[]) => {
  for (const body of bodies) {
    fetchMock.mockResolvedValueOnce({ json: async () => body })
  }
}

beforeEach(() => {
  createClient({ baseApiUrl: MAINNET_RELAY_API })
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('handleSendTransactionStep', () => {
  it('builds the Payment from the step with amount and memo preserved', async () => {
    const sendTransaction = vi.fn().mockResolvedValue(TX_HASH)
    const wallet = adaptXrpWallet(WALLET, sendTransaction)

    const hash = await wallet.handleSendTransactionStep(537724, STEP_ITEM, STEP)

    expect(hash).toBe(TX_HASH)
    const payment = sendTransaction.mock.calls[0][0]
    expect(payment).toEqual({
      TransactionType: 'Payment',
      Account: WALLET,
      Destination: 'rJBdWA9p5KwBoqSQTyMdg3UHLsJVzGVu5m',
      Amount: '10000000',
      Memos: [
        {
          Memo: {
            MemoData:
              '307832333030323432613732643863326634613262643262333134633734343761363338333736373865643264633364633864343138376333333066363634613033'
          }
        }
      ]
    })
    // The solver decodes MemoData as UTF-8 and matches the memo text.
    expect(
      Buffer.from(payment.Memos[0].Memo.MemoData, 'hex').toString('utf8')
    ).toBe(STEP_ITEM.data.memo)
  })

  it('rejects non-XRP currencies instead of sending drops', async () => {
    const sendTransaction = vi.fn()
    const wallet = adaptXrpWallet(WALLET, sendTransaction)
    const item = {
      ...STEP_ITEM,
      data: { ...STEP_ITEM.data, currency: 'RLUSD' }
    } as TransactionStepItem

    await expect(
      wallet.handleSendTransactionStep(537724, item, STEP)
    ).rejects.toThrow('Unsupported XRP step currency: RLUSD')
    expect(sendTransaction).not.toHaveBeenCalled()
  })
})

describe('handleConfirmTransactionStep', () => {
  const confirm = () =>
    adaptXrpWallet(WALLET, vi.fn(), {
      rpcUrl: RPC_URL
    }).handleConfirmTransactionStep(TX_HASH, 537724, vi.fn(), vi.fn())

  it('retries RPC errors until the transaction is validated with tesSUCCESS', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'))
    respond(NOT_FOUND, TOO_BUSY, PENDING, validated('tesSUCCESS'))

    const receipt = confirm()
    await vi.advanceTimersByTimeAsync(10_000)

    await expect(receipt).resolves.toEqual({
      hash: TX_HASH,
      ledgerIndex: 108311165
    })
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(fetchMock.mock.calls[0][0]).toBe(RPC_URL)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      method: 'tx',
      params: [{ transaction: TX_HASH }]
    })
  })

  it('throws when the validated result is not tesSUCCESS', async () => {
    // Without `rpcUrl`, the RPC comes from the client's chain config.
    getClient().chains = [
      { id: 537724, httpRpcUrl: 'https://chain-rpc.example' }
    ] as ReturnType<typeof getClient>['chains']
    respond(validated('tecDST_TAG_NEEDED'))

    await expect(
      adaptXrpWallet(WALLET, vi.fn()).handleConfirmTransactionStep(
        TX_HASH,
        537724,
        vi.fn(),
        vi.fn()
      )
    ).rejects.toThrow('XRP transaction failed: tecDST_TAG_NEEDED')
    expect(fetchMock.mock.calls[0][0]).toBe('https://chain-rpc.example')
  })

  it('times out when an RPC request never settles', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () =>
            reject(new Error('aborted'))
          )
        )
    )

    const receipt = confirm()
    const assertion = expect(receipt).rejects.toThrow(
      'XRP transaction confirmation timed out'
    )
    await vi.advanceTimersByTimeAsync(120_000)
    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('times out when the transaction never validates', async () => {
    fetchMock.mockResolvedValue({ json: async () => NOT_FOUND })

    const receipt = confirm()
    const assertion = expect(receipt).rejects.toThrow(
      'XRP transaction confirmation timed out'
    )
    await vi.advanceTimersByTimeAsync(120_000)
    await assertion
  })
})
