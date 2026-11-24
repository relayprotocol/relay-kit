export const solanaAddressRegex =
  /^(?!T[1-9A-HJ-NP-Za-km-z]{33}$)(?!0x[0-9a-fA-F]{40}$)(?!0x[0-9a-fA-F]{64}$)(?!bc1)[1-9A-HJ-NP-Za-km-z]{32,44}$/
export const solana = {
  id: 792703809
}
export const eclipse = {
  id: 9286185
}
export const eclipseWallets = ['nightlyeclipse', 'okxeclipse']

export function isSolanaAddress(address: string): boolean {
  return solanaAddressRegex.test(address)
}

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Whether a Solana-format address decodes to a 32 byte public key. Partial
 * input such as a half-typed address can match the address regex without
 * being a key.
 */
export function isSolanaPublicKey(address: string): boolean {
  if (!isSolanaAddress(address)) {
    return false
  }

  const bytes: number[] = []
  for (const char of address) {
    let carry = BASE58_ALPHABET.indexOf(char)
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

  let leadingZeros = 0
  while (address[leadingZeros] === BASE58_ALPHABET[0]) {
    leadingZeros++
  }

  return bytes.length + leadingZeros === 32
}
