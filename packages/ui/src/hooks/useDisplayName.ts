import { useMemo } from 'react'
import type { ChainVM } from '@relayprotocol/relay-sdk'
import { isAddress } from 'viem'
import useENSResolver from './useENSResolver.js'
import useLighterAccount from './useLighterAccount.js'
import { truncateAddress } from '../utils/truncate.js'
import { isLighterAddress } from '../utils/lighter.js'
import { isENSName } from '../utils/ens.js'

type UseDisplayNameResult = {
  displayName?: string
  isLoading: boolean
}

/**
 * Returns a display name for an address based on the chain VM type.
 * - EVM: Uses ENS resolution, falls back to truncated address
 * - LVM (Lighter): Shows "lighterID (truncatedEvmAddress)"
 * - Other: Returns truncated address
 */
export default function useDisplayName(
  address?: string,
  vmType?: ChainVM,
  chainId?: number
): UseDisplayNameResult {
  // Only enable ENS lookup for valid EVM addresses or ENS names
  const isValidEvmAddress = address ? isAddress(address) : false
  const isEns = address ? isENSName(address) : false

  // ENS resolution for EVM chains
  const { displayName: ensDisplayName, isLoading: isLoadingENS } =
    useENSResolver(address, {
      enabled: vmType === 'evm' && (isValidEvmAddress || isEns)
    })

  // Lighter account lookup for LVM chains
  const isLighterChain = vmType === 'lvm'
  const isLighterAddr = address ? isLighterAddress(address) : false

  const { data: lighterAccount, isLoading: isLoadingLighter } =
    useLighterAccount(isLighterChain && address ? address : undefined)

  const isLoading =
    (vmType === 'evm' && isLoadingENS) || (isLighterChain && isLoadingLighter)

  const displayName = useMemo(() => {
    if (!address) return undefined

    // EVM: prefer ENS, fallback to truncated
    if (vmType === 'evm') {
      return ensDisplayName || truncateAddress(address)
    }

    // Lighter: display "lighterID (truncatedEvmAddress)"
    if (isLighterChain) {
      const lighterIndex = isLighterAddr
        ? address
        : lighterAccount?.index?.toString()
      const evmAddress = isLighterAddr ? lighterAccount?.l1_address : address

      if (lighterIndex && evmAddress) {
        return `${lighterIndex} (${truncateAddress(evmAddress)})`
      }

      // Fallback while loading or if partial data
      if (lighterIndex) return lighterIndex
      if (evmAddress) return truncateAddress(evmAddress)
      return truncateAddress(address)
    }

    // Other VMs: just truncate
    return truncateAddress(address)
  }, [
    address,
    vmType,
    ensDisplayName,
    isLighterChain,
    isLighterAddr,
    lighterAccount
  ])

  return { displayName, isLoading }
}
