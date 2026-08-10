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
// XRPL ACCOUNT_ONE, a checksum-valid blackhole account with no known key.
// Deliberately not ACCOUNT_ZERO (rrrrrrrrrrrrrrrrrrrrrhoLvTp), which the
// settlement layer already uses as the native-XRP sentinel.
export const xrpDeadAddress = 'rrrrrrrrrrrrrrrrrrrrBZbvji' as const

const eclipseId = 9286185
const zeroChainId = 543210

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
  } else {
    return evmDeadAddress
  }
}

export const isDeadAddress = (address?: string) => {
  if (!address) {
    return false
  }

  if (
    address === eclipseDeadAddress ||
    address === solDeadAddress ||
    address === bitcoinDeadAddress ||
    address === evmDeadAddress ||
    address === tonDeadAddress ||
    address === tronDeadAddress ||
    address === zeroDeadAddress ||
    address === xrpDeadAddress
  ) {
    return true
  }

  return false
}
