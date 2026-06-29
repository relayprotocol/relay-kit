import type { ChainVM } from '../types/RelayChain.js'

export const evmDeadAddress =
  '0x000000000000000000000000000000000000dead' as const
export const solDeadAddress =
  'CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNr' as const
export const eclipseDeadAddress =
  'CrfbABN2sSvmoZLu9eDDfXpaC2nHg42R7AXbHs9eg4S9' as const
export const bitcoinDeadAddress = 'bc1q4vxn43l44h30nkluqfxd9eckf45vr2awz38lwa'
export const tronDeadAddress = 'THa7BwoPfacfiELa63pbmm3g5PGKYmtJyt'
export const zeroDeadAddress = '0x00000000000000000000000000000000000dead0'
export const tonDeadAddress =
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADerZ0z' as const

const eclipseId = 9286185
const zeroChainId = 543210

export function getDeadAddress(vmType?: ChainVM, chainId?: number) {
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
  } else {
    return evmDeadAddress
  }
}

export function isDeadAddress(address?: string) {
  if (!address) {
    return false
  }

  if (
    address === eclipseDeadAddress ||
    address === solDeadAddress ||
    address === bitcoinDeadAddress ||
    address === evmDeadAddress ||
    address === tonDeadAddress
  ) {
    return true
  }

  return false
}
