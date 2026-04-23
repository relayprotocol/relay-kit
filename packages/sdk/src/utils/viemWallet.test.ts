import { describe, it, expect, vi } from 'vitest'
import { adaptViemWallet } from './viemWallet'

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
