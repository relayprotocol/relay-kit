import type { ChainVM } from '../types/RelayChain.js'

export const evmDeadAddress =
  '0x000000000000000000000000000000000000dead' as const
export const solDeadAddress =
  'CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNr' as const
export const eclipseDeadAddress =
  'CrfbABN2sSvmoZLu9eDDfXpaC2nHg42R7AXbHs9eg4S9' as const
export const bitcoinDeadAddress = '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo'
export const tronDeadAddress = 'THa7BwoPfacfiELa63pbmm3g5PGKYmtJyt'
export const zeroDeadAddress = '0x00000000000000000000000000000000000dead0'
export const tonDeadAddress =
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADerZ0z' as const
export const xrpDeadAddress = 'rrrrrrrrrrrrrrrrrrrrBZbvji' as const
// Lighter has no burn address, so placeholder account indexes are used
export const lighterDeadAddress = '462196' as const
export const robinhoodLighterDeadAddress = '33627' as const

const eclipseId = 9286185
const zeroChainId = 543210
const robinhoodLighterChainId = 548123634

export const getDeadAddress = (vmType?: ChainVM, chainId?: number) => {
  if (vmType === 'svm') {
    return chainId === eclipseId ? eclipseDeadAddress : solDeadAddress
  } else if (vmType === 'bvm') {
    return bitcoinDeadAddress
  } else if (chainId === zeroChainId) {
    return zeroDeadAddress
  } else if (vmType === 'tvm') {
    return tronDeadAddress
  } else if (vmType === 'tonvm') {
    return tonDeadAddress
  } else if (vmType === 'xrpvm') {
    return xrpDeadAddress
  } else if (vmType === 'lvm') {
    return chainId === robinhoodLighterChainId
      ? robinhoodLighterDeadAddress
      : lighterDeadAddress
  } else {
    return evmDeadAddress
  }
}

export const isDeadAddress = (address?: string) => {
  if (!address) {
    return false
  }

  // EVM hex addresses are case-insensitive: a checksummed dead address
  // (0x...dEaD) is the same address as the lowercase constant. Lowercase
  // 0x-prefixed input before comparing so the hex dead addresses match
  // regardless of checksum casing. The base58/bech32 dead addresses stay
  // exact-match because their alphabets are case-sensitive.
  const candidate = address.startsWith('0x')
    ? address.toLowerCase()
    : address

  if (
    candidate === eclipseDeadAddress ||
    candidate === solDeadAddress ||
    candidate === bitcoinDeadAddress ||
    candidate === evmDeadAddress ||
    candidate === tonDeadAddress ||
    candidate === tronDeadAddress ||
    candidate === zeroDeadAddress ||
    candidate === xrpDeadAddress ||
    candidate === lighterDeadAddress ||
    candidate === robinhoodLighterDeadAddress
  ) {
    return true
  }

  return false
}
