import type { ChainVM } from '@relayprotocol/relay-sdk'
import { solana } from './solana.js'

export function generateQrWalletDeeplink(
  vm?: ChainVM,
  amount: string = '0',
  tokenAddress?: string,
  toAddress?: string,
  chainId?: number
) {
  if (vm === 'evm') {
    return `ethereum:${toAddress}@${chainId}?value=${tokenAddress ? 0 : amount}`
  } else if (vm === 'svm') {
    if (chainId === solana.id) {
      return `solana:${toAddress}?amount=${tokenAddress ? 0 : amount}`
    }
  } else if (vm === 'bvm') {
    return `bitcoin:${toAddress}?amount=${tokenAddress ? 0 : amount}`
  } else {
    return toAddress
  }
  return undefined
}
