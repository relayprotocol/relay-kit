import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RelayClient } from '../client'
import type { Execute } from '../types'
import { findHyperliquidSendHash } from './hyperliquid'

const USER = '0x30d0984ab738fe2c06f012803dfaa9e2303455e5'
const NONCE = 1767225600123
const SEND_HASH =
  '0xe3a9a4504d4ae51fbf572619c99d8a6eed21cb10f8f6bb72e427b8237c26cba8'
const OTHER_HASH =
  '0xcf7e21bfdd6339729ce33e09405683796d75217393b46d4a595adcc413fdd4be'

const client = { log: vi.fn() } as unknown as RelayClient

const stepItem = (value: Record<string, unknown>) =>
  ({ data: { sign: { value } } }) as Execute['steps'][0]['items'][0]
const sendAsset = stepItem({ type: 'sendAsset', nonce: NONCE })

const ledger = (...entries: unknown[]) => ({ data: entries })

describe('findHyperliquidSendHash', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('Should return the hash of the send whose nonce was signed.', async () => {
    const post = vi
      .spyOn(axios, 'post')
      .mockResolvedValue(
        ledger(
          { hash: OTHER_HASH, delta: { type: 'send', nonce: NONCE - 1 } },
          { hash: OTHER_HASH, delta: { type: 'deposit' } },
          { hash: SEND_HASH, delta: { type: 'send', nonce: NONCE } }
        )
      )

    await expect(
      findHyperliquidSendHash(client, USER, sendAsset)
    ).resolves.toBe(SEND_HASH)
    expect(post).toHaveBeenCalledWith(
      'https://api.hyperliquid.xyz/info',
      expect.objectContaining({
        type: 'userNonFundingLedgerUpdates',
        user: USER
      }),
      expect.anything()
    )
  })

  it('Should keep polling until the send appears, retrying failed lookups.', async () => {
    vi.useFakeTimers()
    const post = vi
      .spyOn(axios, 'post')
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(ledger())
      .mockResolvedValueOnce(
        ledger({ hash: SEND_HASH, delta: { type: 'send', nonce: NONCE } })
      )

    const lookup = findHyperliquidSendHash(client, USER, sendAsset)
    await vi.advanceTimersByTimeAsync(2100)

    await expect(lookup).resolves.toBe(SEND_HASH)
    expect(post).toHaveBeenCalledTimes(3)
  })

  it('Should give up once the timeout passes.', async () => {
    vi.useFakeTimers()
    vi.spyOn(axios, 'post').mockResolvedValue(ledger())

    const lookup = findHyperliquidSendHash(client, USER, sendAsset)
    await vi.advanceTimersByTimeAsync(4000)

    await expect(lookup).resolves.toBeUndefined()
  })

  it('Should skip anything but a signer-owned sendAsset with a nonce.', async () => {
    const post = vi.spyOn(axios, 'post')

    for (const item of [
      stepItem({ type: 'usdSend', time: NONCE }),
      stepItem({ type: 'sendAsset' }),
      stepItem({
        type: 'sendAsset',
        nonce: NONCE,
        fromSubAccount: '0x1d9470d4b963f552e6f671a81619d395877bf409'
      })
    ]) {
      await expect(
        findHyperliquidSendHash(client, USER, item)
      ).resolves.toBeUndefined()
    }
    expect(post).not.toHaveBeenCalled()
  })
})
