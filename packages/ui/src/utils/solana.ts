import { isXrpAddress } from './xrp.js'

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
  // XRP addresses are base58 too and fit the Solana pattern
  return solanaAddressRegex.test(address) && !isXrpAddress(address)
}
