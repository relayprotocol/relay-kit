import { sha256 } from '@noble/hashes/sha2.js'

export const xrp = {
  id: 537724
}

// XRPL's own base58 ordering. Same 58 characters as Bitcoin's alphabet, so a
// Bitcoin ordering looks right but indexes to the wrong bytes.
const XRP_BASE58_ALPHABET =
  'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz'

function decodeXrpBase58(address: string): Uint8Array | undefined {
  const bytes: number[] = []

  for (const char of address) {
    let carry = XRP_BASE58_ALPHABET.indexOf(char)
    if (carry === -1) {
      return undefined
    }

    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58
      bytes[i] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }

  // Each leading alphabet-zero character represents one leading zero byte
  for (const char of address) {
    if (char !== XRP_BASE58_ALPHABET[0]) {
      break
    }
    bytes.push(0)
  }

  return new Uint8Array(bytes.reverse())
}

/**
 * Classic `r...` addresses only. X-addresses have a non-zero version byte and
 * are rejected, since the destination tag they encode can't be forwarded.
 *
 * Does not trim: callers store the string they validated as the recipient, so
 * accepting padded input would forward the padding to the quote.
 */
export function isXrpAddress(address: string): boolean {
  // Bounds the decode; every 25 byte base58check payload lands in this range
  if (address.length < 25 || address.length > 35) {
    return false
  }

  const decoded = decodeXrpBase58(address)
  // 1 version byte + 20 byte account id + 4 byte checksum. Version 0x00 can
  // only come from a leading `r`, so this also pins the prefix.
  if (!decoded || decoded.length !== 25 || decoded[0] !== 0x00) {
    return false
  }

  const expectedChecksum = sha256(sha256(decoded.subarray(0, 21))).subarray(
    0,
    4
  )

  return decoded.subarray(21).every((byte, i) => byte === expectedChecksum[i])
}
