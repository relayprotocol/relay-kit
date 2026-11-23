import { describe, expect, it } from 'vitest'
import { originRefundAddress } from './address.js'

const base = { id: 8453, vmType: 'evm' as const }
const solana = { id: 792703809, vmType: 'svm' as const }
const evmAddress = '0x03508bb71268bba25ecacc8f620e01866650532c'
const solanaAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'

describe('originRefundAddress', () => {
  it('uses an address that is valid on the origin chain', () => {
    expect(originRefundAddress(base, evmAddress)).toBe(evmAddress)
    expect(originRefundAddress(solana, solanaAddress)).toBe(solanaAddress)
  })

  it('skips addresses from another VM', () => {
    expect(originRefundAddress(base, solanaAddress)).toBeUndefined()
    expect(originRefundAddress(solana, evmAddress)).toBeUndefined()
  })

  it('skips missing and placeholder addresses', () => {
    expect(originRefundAddress(base, undefined)).toBeUndefined()
    expect(
      originRefundAddress(base, '0x000000000000000000000000000000000000dead')
    ).toBeUndefined()
  })
})
