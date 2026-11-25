import { describe, it, expect } from 'vitest'
import { getAddress } from 'viem'
import {
  isDeadAddress,
  getDeadAddress,
  evmDeadAddress,
  solDeadAddress,
  eclipseDeadAddress,
  bitcoinDeadAddress,
  tronDeadAddress,
  zeroDeadAddress,
  tonDeadAddress,
  xrpDeadAddress,
  lighterDeadAddress,
  robinhoodLighterDeadAddress
} from './address.js'

describe('isDeadAddress', () => {
  it('rejects the EIP-55 checksummed dead address', () => {
    const checksummed = getAddress(evmDeadAddress)

    expect(checksummed).not.toBe(evmDeadAddress)
    expect(isDeadAddress(checksummed)).toBe(true)
  })

  it('still rejects the lowercase dead address', () => {
    expect(isDeadAddress(evmDeadAddress)).toBe(true)
  })

  it('rejects the checksummed zero-chain dead address', () => {
    const checksummed = getAddress(zeroDeadAddress)

    expect(checksummed).not.toBe(zeroDeadAddress)
    expect(isDeadAddress(checksummed)).toBe(true)
  })

  it('rejects every dead address constant', () => {
    const deadAddresses = [
      evmDeadAddress,
      solDeadAddress,
      eclipseDeadAddress,
      bitcoinDeadAddress,
      tronDeadAddress,
      zeroDeadAddress,
      tonDeadAddress,
      xrpDeadAddress,
      lighterDeadAddress,
      robinhoodLighterDeadAddress
    ]

    for (const address of deadAddresses) {
      expect(isDeadAddress(address)).toBe(true)
    }
  })

  it('keeps base58/bech32 dead addresses case-sensitive', () => {
    // Lowercasing must not be applied to non-0x addresses: a lowercased
    // Solana or Tron dead address is a different address, not the burn one.
    expect(isDeadAddress(solDeadAddress.toLowerCase())).toBe(false)
    expect(isDeadAddress(tronDeadAddress.toLowerCase())).toBe(false)
    expect(isDeadAddress(bitcoinDeadAddress.toLowerCase())).toBe(false)
  })

  it('returns false for non-dead addresses and empty input', () => {
    expect(isDeadAddress('0x0000000000000000000000000000000000000001')).toBe(
      false
    )
    expect(isDeadAddress('CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNq')).toBe(
      false
    )
    expect(isDeadAddress(undefined)).toBe(false)
    expect(isDeadAddress('')).toBe(false)
  })
})

describe('getDeadAddress', () => {
  it('returns the EVM dead address by default', () => {
    expect(getDeadAddress()).toBe(evmDeadAddress)
    expect(getDeadAddress('evm')).toBe(evmDeadAddress)
    expect(getDeadAddress('evm', 1)).toBe(evmDeadAddress)
  })

  it('returns the Solana dead address for SVM, Eclipse for chain 9286185', () => {
    expect(getDeadAddress('svm')).toBe(solDeadAddress)
    expect(getDeadAddress('svm', 9286185)).toBe(eclipseDeadAddress)
  })

  it('returns the Bitcoin dead address for BVM', () => {
    expect(getDeadAddress('bvm')).toBe(bitcoinDeadAddress)
  })

  it('returns the zero-chain dead address for chain 543210', () => {
    expect(getDeadAddress(undefined, 543210)).toBe(zeroDeadAddress)
  })

  it('returns the Tron dead address for TVM', () => {
    expect(getDeadAddress('tvm')).toBe(tronDeadAddress)
  })

  it('returns the TON dead address for TONVM', () => {
    expect(getDeadAddress('tonvm')).toBe(tonDeadAddress)
  })

  it('returns the XRP dead address for XRPVM', () => {
    expect(getDeadAddress('xrpvm')).toBe(xrpDeadAddress)
  })

  it('returns the Lighter dead address for LVM, Robinhood variant for chain 548123634', () => {
    expect(getDeadAddress('lvm')).toBe(lighterDeadAddress)
    expect(getDeadAddress('lvm', 548123634)).toBe(
      robinhoodLighterDeadAddress
    )
  })
})
