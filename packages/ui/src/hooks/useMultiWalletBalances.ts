import { useMemo, useContext } from 'react'
import { useQueries } from '@tanstack/react-query'
import { type BalanceMap, type DuneBalanceResponse } from './useDuneBalances.js'
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
  primaryAddress?: string,
  evmChainIds: 'mainnet' | 'testnet' = 'mainnet'
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

  const balanceQueries = useQueries({
    queries: walletAddresses.map((address) => {
      const isEvmAddress = isAddress(address)
      const isSvmAddress = isSolanaAddress(address)

      let url = `${
        providerOptions?.duneConfig?.apiBaseUrl ?? 'https://api.sim.dune.com'
      }/v1/evm/balances/${address.toLowerCase()}?chain_ids=${evmChainIds}&exclude_spam_tokens=true`

      if (isSvmAddress) {
        url = `${
          providerOptions?.duneConfig?.apiBaseUrl ?? 'https://api.sim.dune.com'
        }/beta/svm/balances/${address}?chain_ids=all&exclude_spam_tokens=true`
      }

      return {
        queryKey: ['useDuneBalances', address],
        queryFn: async (): Promise<DuneBalanceResponse> => {
          if (!isSvmAddress && !isEvmAddress) {
            return null
          }

          const response = await fetch(url, {
            headers: providerOptions?.duneConfig?.apiKey
              ? {
                  'X-Sim-Api-Key': providerOptions.duneConfig.apiKey
                }
              : {}
          })

          if (!response.ok) {
            throw new Error(`Failed to fetch balance for ${address}`)
          }

          const data = await response.json()

          if (data?.balances) {
            // Filter out invalid amounts like useDuneBalances does
            const validBalances = data.balances.filter((balance: any) => {
              try {
                BigInt(balance.amount)
                return true
              } catch (e) {
                return false
              }
            })

            return {
              ...data,
              balances: validBalances
            } as DuneBalanceResponse
          }

          return data as DuneBalanceResponse
        },
        enabled: Boolean(
          address && address.trim() !== '' && (isEvmAddress || isSvmAddress)
        ),
        staleTime: 60000,
        gcTime: 60000,
        retry: 1
      }
    })
  })

  // Merge all balance data with proper parallelization - no more 5-wallet limit!
  const { mergedBalanceMap, mergedDuneTokens, isLoadingBalances } =
    useMemo(() => {
      const mergedMap: BalanceMap = {}
      const allBalances: NonNullable<DuneBalanceResponse>['balances'] = []
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
        mergedDuneTokens:
          allBalances.length > 0 ? { balances: allBalances } : undefined,
        isLoadingBalances: anyLoading
      }
    }, [balanceQueries])

  return {
    balanceMap: mergedBalanceMap,
    data: mergedDuneTokens,
    isLoading: isLoadingBalances
  }
}
