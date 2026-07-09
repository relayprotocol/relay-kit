import type { ChainVM } from '@relayprotocol/relay-sdk'

export const evmDeadAddress =
  '0x000000000000000000000000000000000000dead' as const
export const solDeadAddress =
  'CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNr' as const

export function getDeadAddress(vmType?: ChainVM) {
  if (vmType === 'svm') {
    return solDeadAddress
  } else {
    return evmDeadAddress
  }
}
