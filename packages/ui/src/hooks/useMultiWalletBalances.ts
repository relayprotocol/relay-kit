import { useMemo, useContext } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  CODEX_SVM_NETWORK_ID,
  fetchCodexBalances,
  getEvmNetworkIds,
  getSvmNativeChains,
  type BalanceMap,
  type WalletBalanceResponse
} from './useCodexBalances.js'
import useRelayClient from './useRelayClient.js'
import { isDeadAddress } from '@relayprotocol/relay-sdk'
import { ProviderOptionsContext } from '../providers/RelayKitProvider.js'
import { isAddress } from 'viem'
import { isSolanaAddress } from '../utils/solana.js'
import { isValidAddress as validateAddress } from '../utils/address.js'
import type { LinkedWallet } from '../types/index.js'

/**
 * Fetches and merges balances for linked wallets
 */
export const useMultiWalletBalances = (
  linkedWallets?: LinkedWallet[],
  primaryAddress?: string
) => {
  const walletAddresses = useMemo(() => {
    const addresses = new Set<string>()

    if (primaryAddress && !isDeadAddress(primaryAddress)) {
      const matchingWallet = linkedWallets?.find(
        (wallet) =>
          wallet.address === primaryAddress ||
          (wallet.vmType === 'evm' &&
            wallet.address.toLowerCase() === primaryAddress.toLowerCase())
      )

      if (matchingWallet) {
        const isValid = validateAddress(
          matchingWallet.vmType,
          primaryAddress,
          undefined,
          matchingWallet.connector
        )

        if (isValid) {
          addresses.add(primaryAddress)
        }
      }
    }

    return Array.from(addresses)
  }, [primaryAddress, linkedWallets])

  const providerOptions = useContext(ProviderOptionsContext)
  const relayClient = useRelayClient()

  const balanceQueries = useQueries({
    queries: walletAddresses.map((address) => {
      const isEvmAddress = isAddress(address)
      const isSvmAddress = isSolanaAddress(address)
      const networks = isSvmAddress
        ? [CODEX_SVM_NETWORK_ID]
        : getEvmNetworkIds(relayClient?.chains)

      return {
        queryKey: ['useCodexBalances', address],
        queryFn: async (): Promise<WalletBalanceResponse> => {
          if (!isSvmAddress && !isEvmAddress) {
            return null
          }

          return fetchCodexBalances(
            address,
            providerOptions?.codexConfig ?? {},
            networks,
            isSvmAddress ? getSvmNativeChains(relayClient?.chains) : undefined
          )
        },
        enabled: Boolean(
          address &&
            address.trim() !== '' &&
            (isEvmAddress || isSvmAddress) &&
            networks.length > 0 &&
            (providerOptions?.codexConfig?.apiKey !== undefined ||
              providerOptions?.codexConfig?.apiBaseUrl !== undefined)
        ),
        staleTime: 60000,
        gcTime: 60000,
        retry: 1
      }
    })
  })

  // Merge all balance data with proper parallelization - no more 5-wallet limit!
  const { mergedBalanceMap, mergedTokens, isLoadingBalances } = useMemo(() => {
    const mergedMap: BalanceMap = {}
    const allBalances: NonNullable<WalletBalanceResponse>['balances'] = []
    let anyLoading = false

    balanceQueries.forEach((query) => {
      if (query.isLoading) anyLoading = true

      if (query.data?.balances) {
        const balanceMap: BalanceMap = {}
        query.data.balances.forEach((balance) => {
          const key = `${balance.chain_id}:${balance.address.toLowerCase()}`
          balanceMap[key] = balance
        })

        Object.entries(balanceMap).forEach(([key, balance]) => {
          if (mergedMap[key]) {
            // Token exists in multiple wallets - sum the amounts
            const existingAmount = BigInt(mergedMap[key].amount)
            const newAmount = BigInt(balance.amount)
            const totalAmount = existingAmount + newAmount

            mergedMap[key] = {
              ...balance,
              amount: totalAmount.toString(),
              value_usd:
                (mergedMap[key].value_usd || 0) + (balance.value_usd || 0)
            }
          } else {
            mergedMap[key] = balance
          }
        })

        allBalances.push(...query.data.balances)
      }
    })

    return {
      mergedBalanceMap: mergedMap,
      mergedTokens:
        allBalances.length > 0 ? { balances: allBalances } : undefined,
      isLoadingBalances: anyLoading
    }
  }, [balanceQueries])

  return {
    balanceMap: mergedBalanceMap,
    data: mergedTokens,
    isLoading: isLoadingBalances
  }
}
