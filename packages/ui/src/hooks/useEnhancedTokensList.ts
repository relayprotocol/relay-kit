import { useMemo } from 'react'
import type { BalanceMap } from './useDuneBalances'
import { type Currency } from '@relayprotocol/relay-kit-hooks'
import { useInternalRelayChains } from '../hooks/index.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'

export type EnhancedToken = {
  chainId: number
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI: string
  verified?: boolean
  vmType?: 'bvm' | 'evm' | 'svm' | 'tvm' | 'tonvm' | 'suivm' | 'hypevm'
  balance?: {
    amount: string
    price_usd?: number
    value_usd?: number
  }
  groupID?: string
  isGasCurrency?: boolean
  chain?: RelayChain
}

export const useEnhancedTokensList = (
  tokenLists: Currency[] | undefined,
  balanceMap: BalanceMap | undefined,
  context: 'from' | 'to',
  multiWalletSupportEnabled: boolean,
  chainId?: number,
  sortByBalance: boolean = true
): EnhancedToken[] => {
  const { chains } = useInternalRelayChains()

  const chainCurrencyMap = useMemo(() => {
    if (!chains) return new Map()
    return new Map(
      chains
        .filter((chain) => chain?.currency?.address)
        .map((chain) => [
          `${chain.id}:${chain.currency?.address?.toLowerCase()}`,
          true
        ])
    )
  }, [chains])

  return useMemo(() => {
    if (!tokenLists) return []

    const enhancedTokens = tokenLists
      .map((currency) => {
        // Validate that all required fields exist
        if (
          typeof currency?.chainId !== 'number' ||
          !currency?.address ||
          !currency?.symbol ||
          !currency?.name ||
          typeof currency?.decimals !== 'number'
        ) {
          return null
        }

        // Construct the enhanced token with all required fields
        const chain = chains?.find((c) => c.id === currency.chainId)
        const balanceKey = `${currency.chainId}:${currency.address.toLowerCase()}`
        const balance = balanceMap?.[balanceKey]

        const enhancedToken: EnhancedToken = {
          chainId: currency.chainId,
          address: currency.address,
          symbol: currency.symbol,
          name: currency.name,
          decimals: currency.decimals,
          logoURI: currency.metadata?.logoURI ?? '',
          verified: currency.metadata?.verified ?? false,
          vmType: currency.vmType,
          balance,
          isGasCurrency:
            currency.chainId !== 1337 &&
            chainCurrencyMap.has(
              `${currency.chainId}:${currency.address.toLowerCase()}`
            ),
          chain
        }

        return enhancedToken
      })
      // Remove any tokens that failed validation
      .filter((token): token is EnhancedToken => token !== null)
      // Remove duplicate tokens by chainId:address
      .filter(
        (token, index, self) =>
          index ===
          self.findIndex(
            (t) =>
              t.chainId === token.chainId &&
              t.address.toLowerCase() === token.address.toLowerCase()
          )
      )
      // Filter by chainId if specified
      .filter((token) => !chainId || token.chainId === chainId)
      // Filter out non-EVM tokens when multiWallet support is disabled
      .filter((token) => {
        if (context === 'from' && !multiWalletSupportEnabled) {
          return token.vmType === 'evm'
        }
        return true
      })
      .sort((a, b) => {
        // Only sort by USD value if sortByBalance is true
        if (sortByBalance) {
          const aValueUsd = a.balance?.value_usd ?? 0
          const bValueUsd = b.balance?.value_usd ?? 0
          if (aValueUsd !== bValueUsd) {
            return bValueUsd - aValueUsd
          }
        }

        // Maintain original order if not sorting by balance
        return 0
      })

    return enhancedTokens
  }, [
    tokenLists,
    balanceMap,
    context,
    multiWalletSupportEnabled,
    chainId,
    chainCurrencyMap,
    sortByBalance
  ])
}
