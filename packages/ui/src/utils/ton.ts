export const ton = {
  id: 224235520
}

// TON addresses come in two forms:
// - User-friendly: 48-char base64url string. Mainnet prefixes are `EQ`
//   (bounceable) and `UQ` (non-bounceable); testnet uses `kQ`/`0Q`.
// - Raw: `<workchain>:<64 hex chars>`, e.g. `0:abc...`.
const tonFriendlyAddressRegex = /^[EUkq0]Q[A-Za-z0-9_-]{46}$/
const tonRawAddressRegex = /^-?\d+:[a-fA-F0-9]{64}$/

export function isTonAddress(address: string): boolean {
  return (
    tonFriendlyAddressRegex.test(address) || tonRawAddressRegex.test(address)
  )
}
