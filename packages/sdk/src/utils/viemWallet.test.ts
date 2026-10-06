import { describe, it, expect, vi } from 'vitest'
import { createWalletClient, custom } from 'viem'
import { adaptViemWallet } from './viemWallet'

const INK_CHAIN_ID = 57073

vi.mock('../client.js', () => ({
  getClient: () => ({
    chains: [
      {
        id: 57073,
        viemChain: {
          id: 57073,
          name: 'Ink',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://rpc-gel.inkonchain.com'] } }
        }
      }
    ],
    log: vi.fn()
  })
}))

const buildWallet = (overrides: Record<string, any> = {}) =>
  ({
    account: { address: '0x0000000000000000000000000000000000000001' },
    transport: { request: vi.fn() },
    getCapabilities: vi
      .fn()
      .mockResolvedValue({ atomicBatch: { supported: true } }),
    ...overrides
  }) as any

describe('adaptViemWallet disableCapabilitiesCheck', () => {
  it('supportsAtomicBatch calls wallet.getCapabilities by default', async () => {
    const wallet = buildWallet()
    const adapted = adaptViemWallet(wallet)

    const result = await adapted.supportsAtomicBatch!(1)

    expect(result).toBe(true)
    expect(wallet.getCapabilities).toHaveBeenCalledWith({
      account: wallet.account,
      chainId: 1
    })
  })

  it('supportsAtomicBatch returns false and skips getCapabilities when disabled', async () => {
    const wallet = buildWallet()
    const adapted = adaptViemWallet(wallet, { disableCapabilitiesCheck: true })

    const result = await adapted.supportsAtomicBatch!(1)

    expect(result).toBe(false)
    expect(wallet.getCapabilities).not.toHaveBeenCalled()
  })

  it('does not await a hanging getCapabilities when disabled', async () => {
    // Simulates the Coinbase-Wallet-via-Dynamic case: getCapabilities
    // never resolves. With the flag, we must not call it at all.
    const hangingGetCapabilities = vi
      .fn()
      .mockImplementation(() => new Promise<never>(() => {}))
    const wallet = buildWallet({ getCapabilities: hangingGetCapabilities })
    const adapted = adaptViemWallet(wallet, { disableCapabilitiesCheck: true })

    await expect(adapted.supportsAtomicBatch!(1)).resolves.toBe(false)
    expect(hangingGetCapabilities).not.toHaveBeenCalled()
  })
})

describe('adaptViemWallet switchChain', () => {
  // EIP-1193 provider that doesn't know the chain and responds to
  // wallet_addEthereumChain with the given error (or success when undefined)
  const buildProvider = (addChainError?: { code: number; message: string }) => ({
    request: vi.fn(async ({ method }: { method: string }) => {
      if (method === 'wallet_switchEthereumChain') {
        throw Object.assign(new Error('Unrecognized chain ID "0xdef1".'), {
          code: 4902
        })
      }
      if (method === 'wallet_addEthereumChain') {
        if (addChainError) {
          throw Object.assign(new Error(addChainError.message), {
            code: addChainError.code
          })
        }
        return null
      }
      return null
    })
  })

  const adapt = (provider: ReturnType<typeof buildProvider>) =>
    adaptViemWallet(
      createWalletClient({ transport: custom(provider, { retryCount: 0 }) })
    )

  it('maps a rejected wallet_addEthereumChain to an unsupported chain error (Coinbase Wallet, Ink origin)', async () => {
    const provider = buildProvider({
      code: -32004,
      message: 'Method "wallet_addEthereumChain" is not supported.'
    })

    await expect(adapt(provider).switchChain(INK_CHAIN_ID)).rejects.toThrow(
      'Wallet does not support chain'
    )
    expect(provider.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'wallet_addEthereumChain' })
    )
  })

  it('rethrows other addChain errors unchanged', async () => {
    const provider = buildProvider({ code: 4100, message: 'Wallet is locked' })

    await expect(adapt(provider).switchChain(INK_CHAIN_ID)).rejects.toThrow(
      'Wallet is locked'
    )
  })

  it('resolves when addChain succeeds', async () => {
    const provider = buildProvider()

    await expect(
      adapt(provider).switchChain(INK_CHAIN_ID)
    ).resolves.toBeUndefined()
  })
})
