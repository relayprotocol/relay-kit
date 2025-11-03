import { useMemo } from 'react'
import useDuneBalances, {
  type BalanceMap,
  type DuneBalanceResponse
} from './useDuneBalances.js'
import { isDeadAddress } from '@relayprotocol/relay-sdk'

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
  const walletAddresses = useMemo(() => {
    const addresses = new Set<string>()

    if (
      primaryAddress &&
      !isDeadAddress(primaryAddress) &&
      isValidAddress
    ) {
      addresses.add(primaryAddress)
    }

    if (linkedWallets) {
      linkedWallets.forEach((wallet) => {
        if (
          wallet.address &&
          !isDeadAddress(wallet.address)
        ) {
          addresses.add(wallet.address)
        }
      })
    }

    return Array.from(addresses)
  }, [primaryAddress, isValidAddress, linkedWallets])

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
