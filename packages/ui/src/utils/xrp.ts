import { sha256 } from '@noble/hashes/sha2.js'

export const xrp = {
  id: 537724
}

// XRPL uses its own base58 alphabet (the "Ripple" alphabet), which orders the
// characters differently to Bitcoin's. Classic addresses are the base58check
// encoding of a 0x00 type prefix followed by a 20 byte account id.
const XRP_BASE58_ALPHABET =
  'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz'
const XRP_ACCOUNT_ID_PREFIX = 0x00
const XRP_DECODED_LENGTH = 25 // 1 prefix + 20 account id + 4 checksum

// Cheap structural check so obviously wrong input short circuits before we
// spend a hash on it. X-addresses (`X`/`T` prefixed, destination tag encoded
// into the address) are intentionally rejected -- they are out of scope for v1.
const xrpClassicAddressRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/

function decodeXrpBase58(address: string): Uint8Array | undefined {
  const bytes: number[] = []

  for (const char of address) {
    const value = XRP_BASE58_ALPHABET.indexOf(char)
    if (value === -1) {
      return undefined
    }

    let carry = value
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
  for (
    let i = 0;
    i < address.length && address[i] === XRP_BASE58_ALPHABET[0];
    i++
  ) {
    bytes.push(0)
  }

  return new Uint8Array(bytes.reverse())
}

export function isXrpAddress(address: string): boolean {
  if (!xrpClassicAddressRegex.test(address)) {
    return false
  }

  const decoded = decodeXrpBase58(address)
  if (
    !decoded ||
    decoded.length !== XRP_DECODED_LENGTH ||
    decoded[0] !== XRP_ACCOUNT_ID_PREFIX
  ) {
    return false
  }

  const payload = decoded.subarray(0, 21)
  const checksum = decoded.subarray(21)
  const expectedChecksum = sha256(sha256(payload)).subarray(0, 4)

  return checksum.every((byte, index) => byte === expectedChecksum[index])
}
