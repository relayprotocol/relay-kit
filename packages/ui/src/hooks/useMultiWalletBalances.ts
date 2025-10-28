import { useMemo } from 'react'
import useDuneBalances, {
  type BalanceMap,
  type DuneBalanceResponse
} from './useDuneBalances.js'
import {
  evmDeadAddress,
  solDeadAddress,
  bitcoinDeadAddress
} from '@relayprotocol/relay-sdk'

type LinkedWallet = {
  address: string
  [key: string]: any
}

/**
 * Fetches and merges balances for multiple linked wallets
 */
export const useMultiWalletBalances = (
  linkedWallets?: LinkedWallet[],
  primaryAddress?: string,
  isValidAddress?: boolean,
  evmChainIds: 'mainnet' | 'testnet' = 'mainnet'
) => {
  // Get all unique wallet addresses
  const walletAddresses = useMemo(() => {
    const addresses = new Set<string>()

    // Add primary address
    if (
      primaryAddress &&
      primaryAddress !== evmDeadAddress &&
      primaryAddress !== solDeadAddress &&
      primaryAddress !== bitcoinDeadAddress &&
      isValidAddress
    ) {
      addresses.add(primaryAddress)
    }

    // Add all linked wallet addresses
    if (linkedWallets) {
      linkedWallets.forEach((wallet) => {
        if (
          wallet.address &&
          wallet.address !== evmDeadAddress &&
          wallet.address !== solDeadAddress &&
          wallet.address !== bitcoinDeadAddress
        ) {
          addresses.add(wallet.address)
        }
      })
    }

    return Array.from(addresses)
  }, [primaryAddress, isValidAddress, linkedWallets])

  // Fetch balances for each wallet (up to 10 wallets)
  // React hooks must be called unconditionally, so we call up to a fixed max
  const balance1 = useDuneBalances(walletAddresses[0], evmChainIds, {
    staleTime: 60000,
    gcTime: 60000
  })
  const balance2 = useDuneBalances(walletAddresses[1], evmChainIds, {
    staleTime: 60000,
    gcTime: 60000
  })
  const balance3 = useDuneBalances(walletAddresses[2], evmChainIds, {
    staleTime: 60000,
    gcTime: 60000
  })
  const balance4 = useDuneBalances(walletAddresses[3], evmChainIds, {
    staleTime: 60000,
    gcTime: 60000
  })
  const balance5 = useDuneBalances(walletAddresses[4], evmChainIds, {
    staleTime: 60000,
    gcTime: 60000
  })

  // Merge all balance data
  const { mergedBalanceMap, mergedDuneTokens, isLoadingBalances } =
    useMemo(() => {
      const queries = [balance1, balance2, balance3, balance4, balance5].slice(
        0,
        walletAddresses.length
      )
      const mergedMap: BalanceMap = {}
      const allBalances: NonNullable<DuneBalanceResponse>['balances'] = []
      let anyLoading = false

      queries.forEach((query) => {
        if (query.isLoading) anyLoading = true
        if (query.balanceMap) {
          // Merge balances - if token exists in multiple wallets, sum them
          Object.entries(query.balanceMap).forEach(([key, balance]) => {
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
        }
        if (query.data?.balances) {
          allBalances.push(...query.data.balances)
        }
      })

      return {
        mergedBalanceMap: mergedMap,
        mergedDuneTokens:
          allBalances.length > 0 ? { balances: allBalances } : undefined,
        isLoadingBalances: anyLoading
      }
    }, [
      balance1,
      balance2,
      balance3,
      balance4,
      balance5,
      walletAddresses.length
    ])

  return {
    balanceMap: mergedBalanceMap,
    data: mergedDuneTokens,
    isLoading: isLoadingBalances
  }
}
