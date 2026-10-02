import { describe, it, expect, vi, afterEach } from 'vitest'
import { isSolanaTokenAccount } from './solanaTokenAccount'

const RPC_URL = 'https://api.mainnet-beta.solana.com'

// USDC token account that received an unrecoverable fill when used as a recipient
const USDC_TOKEN_ACCOUNT = 'DZNKTc2Jaf5XEtN3GE5G2QNbiC7DjhUPLnDLtVXCE6ys'
const USDC_TOKEN_ACCOUNT_OWNER = '3aa32ojP4CeoEg8KpMXFmjP9vSnBJtdUQnc6aWchkD6v'

const accountInfo = (value: unknown) => ({
  jsonrpc: '2.0',
  result: { context: { apiVersion: '4.3.0', slot: 452667255 }, value },
  id: 1
})

const responses: Record<string, unknown> = {
  [USDC_TOKEN_ACCOUNT]: accountInfo({
    data: ['', 'base64'],
    executable: false,
    lamports: 2039280,
    owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    rentEpoch: 18446744073709551615,
    space: 165
  }),
  [USDC_TOKEN_ACCOUNT_OWNER]: accountInfo({
    data: ['', 'base64'],
    executable: false,
    lamports: 544672606,
    owner: '11111111111111111111111111111111',
    rentEpoch: 18446744073709551615,
    space: 0
  })
}

const mockRpc = (
  handler: (address: string) => unknown = (address) =>
    responses[address] ?? accountInfo(null)
) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
    const body = JSON.parse(init?.body as string)
    return new Response(JSON.stringify(handler(body.params[0])))
  })

describe('isSolanaTokenAccount', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Should block a USDC token account.', async () => {
    mockRpc()
    await expect(
      isSolanaTokenAccount(RPC_URL, USDC_TOKEN_ACCOUNT)
    ).resolves.toBe(true)
  })

  it('Should block a Token-2022 account.', async () => {
    mockRpc(() =>
      accountInfo({
        data: ['', 'base64'],
        executable: false,
        lamports: 2074080,
        owner: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
        rentEpoch: 18446744073709551615,
        space: 170
      })
    )
    await expect(
      isSolanaTokenAccount(RPC_URL, USDC_TOKEN_ACCOUNT)
    ).resolves.toBe(true)
  })

  it('Should allow a system-owned wallet.', async () => {
    mockRpc()
    await expect(
      isSolanaTokenAccount(RPC_URL, USDC_TOKEN_ACCOUNT_OWNER)
    ).resolves.toBe(false)
  })

  it('Should allow an address with no account.', async () => {
    mockRpc()
    await expect(
      isSolanaTokenAccount(
        RPC_URL,
        '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWN'
      )
    ).resolves.toBe(false)
  })

  it('Should throw on RPC errors.', async () => {
    mockRpc(() => ({
      jsonrpc: '2.0',
      error: { code: -32602, message: 'Invalid param' },
      id: 1
    }))
    await expect(
      isSolanaTokenAccount(RPC_URL, 'not-an-address')
    ).rejects.toThrow('Invalid param')
  })
})
