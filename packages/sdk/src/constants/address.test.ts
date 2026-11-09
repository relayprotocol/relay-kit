import { describe, it, expect } from 'vitest'
import { getAddress } from 'viem'
import { isDeadAddress, evmDeadAddress } from './address.js'

describe('isDeadAddress', () => {
  it('rejects the EIP-55 checksummed dead address', () => {
    const checksummed = getAddress(evmDeadAddress)
    // 0x000000000000000000000000000000000000dEaD
    expect(checksummed).not.toBe(evmDeadAddress)
    expect(isDeadAddress(checksummed)).toBe(true)
  })
  it('still rejects the lowercase dead address', () => {
    expect(isDeadAddress(evmDeadAddress)).toBe(true)
  })
})
