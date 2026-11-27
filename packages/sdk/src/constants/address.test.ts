import { describe, it, expect } from 'vitest'
import { getAddress } from 'viem'
import {
  isDeadAddress,
  evmDeadAddress,
  solDeadAddress,
  eclipseDeadAddress,
  bitcoinDeadAddress,
  tronDeadAddress,
  tonDeadAddress,
  xrpDeadAddress,
  zeroDeadAddress
} from './address.js'

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

describe('isDeadAddress keeps non-EVM burn addresses exact-match', () => {
  it('still rejects the unchanged Solana dead address', () => {
    expect(isDeadAddress(solDeadAddress)).toBe(true)
  })
  it('does not reject a case-altered Solana dead address', () => {
    expect(isDeadAddress(solDeadAddress.toLowerCase())).toBe(false)
    expect(isDeadAddress(solDeadAddress.toUpperCase())).toBe(false)
  })
  it('still rejects the unchanged Eclipse dead address', () => {
    expect(isDeadAddress(eclipseDeadAddress)).toBe(true)
  })
  it('does not reject a case-altered Eclipse dead address', () => {
    expect(isDeadAddress(eclipseDeadAddress.toLowerCase())).toBe(false)
  })
  it('still rejects the unchanged Bitcoin dead address', () => {
    expect(isDeadAddress(bitcoinDeadAddress)).toBe(true)
  })
  it('does not reject a case-altered Bitcoin dead address', () => {
    expect(isDeadAddress(bitcoinDeadAddress.toLowerCase())).toBe(false)
  })
  it('still rejects the unchanged Tron dead address', () => {
    expect(isDeadAddress(tronDeadAddress)).toBe(true)
  })
  it('does not reject a case-altered Tron dead address', () => {
    expect(isDeadAddress(tronDeadAddress.toLowerCase())).toBe(false)
  })
  it('still rejects the unchanged TON dead address', () => {
    expect(isDeadAddress(tonDeadAddress)).toBe(true)
  })
  it('does not reject a case-altered TON dead address', () => {
    expect(isDeadAddress(tonDeadAddress.toLowerCase())).toBe(false)
  })
  it('still rejects the unchanged XRP dead address', () => {
    expect(isDeadAddress(xrpDeadAddress)).toBe(true)
  })
  it('does not reject a case-altered XRP dead address', () => {
    expect(isDeadAddress(xrpDeadAddress.toUpperCase())).toBe(false)
  })
  it('rejects the Zero-chain dead address in any hex case', () => {
    expect(isDeadAddress(zeroDeadAddress)).toBe(true)
    expect(isDeadAddress('0x00000000000000000000000000000000000DEAD0')).toBe(true)
  })
})
