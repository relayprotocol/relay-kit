import { isAddress } from 'viem'
import type { ChainVM } from '@relayprotocol/relay-sdk'

const ENS_NAME_REGEX = /^[a-zA-Z0-9-]{3,}\.eth$/
const LIGHTER_ADDRESS_REGEX = /^\d+$/

export function isENSName(str: string): boolean {
  return ENS_NAME_REGEX.test(str)
}

export function isLighterAddress(str: string): boolean {
  return LIGHTER_ADDRESS_REGEX.test(str)
}

function isSolanaAddress(str: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str)
}

function isBitcoinAddress(str: string): boolean {
  return (
    /^(1|3)[a-zA-Z0-9]{24,33}$/.test(str) || /^bc1[a-zA-Z0-9]{6,87}$/.test(str)
  )
}

export function isValidAddress(
  vmType: ChainVM | string | undefined,
  address: string,
  _chainId?: number
): boolean {
  if (!address || address.trim() === '') return false
  switch (vmType) {
    case 'evm':
    case 'hypevm':
      return isAddress(address)
    case 'svm':
      return isSolanaAddress(address)
    case 'bvm':
      return isBitcoinAddress(address)
    case 'lvm':
      return isLighterAddress(address) || isAddress(address)
    default:
      return address.trim().length > 0
  }
}

export function isWalletVmTypeCompatible(
  walletVmType: ChainVM | string,
  chainVmType: ChainVM | string
): boolean {
  if (walletVmType === chainVmType) return true
  // HypeVM accepts EVM wallets
  if (chainVmType === 'hypevm' && walletVmType === 'evm') return true
  return false
}

export function truncateAddress(addr: string, chars = 4): string {
  if (!addr || addr.length < chars * 2 + 2) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-chars)}`
}
