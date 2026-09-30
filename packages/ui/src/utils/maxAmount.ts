import {
  MAX_INPUT_BUFFER_BPS,
  MIN_INPUT_BUFFER_UNITS
} from '../constants/maxAmountBuffer.js'

/**
 * Headroom subtracted from a native balance on MAX to avoid exact-balance
 * execution edge cases.
 */
export const getExecutionBuffer = (amount: bigint): bigint => {
  if (amount <= 0n) return 0n

  const bpsBuffer = (amount * MAX_INPUT_BUFFER_BPS) / 10000n
  const minimumBuffer =
    amount > MIN_INPUT_BUFFER_UNITS ? MIN_INPUT_BUFFER_UNITS : amount

  return bpsBuffer > minimumBuffer ? bpsBuffer : minimumBuffer
}

/**
 * Returns the amount to populate when MAX is clicked. Native tokens keep an
 * execution buffer plus the gas fee buffer; other tokens use the full balance
 * since gas is paid in the native token.
 */
export const getMaxAmount = (
  balance: bigint,
  isFromNative: boolean,
  feeBufferAmount: bigint = 0n
): bigint => {
  if (balance <= 0n) return 0n
  if (!isFromNative) return balance

  const totalBufferAmount = getExecutionBuffer(balance) + feeBufferAmount
  return balance > totalBufferAmount ? balance - totalBufferAmount : 0n
}
