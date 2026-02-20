import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAddress, zeroAddress } from 'viem'
import { ProviderOptionsContext } from '@/providers/RelayKitProvider.js'

const SOLANA_ID = 792703809
const ECLIPSE_ID = 9286185

/** Returns true if this looks like a Solana base58 address */
function isSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)
}

export type DuneBalance = {
  chain: string
  chain_id: number
  address: string
  amount: string
  symbol: string
  decimals: number
  price_usd?: number
  value_usd?: number
}

export type DuneBalanceResponse = {
  wallet_address: string
  balances: DuneBalance[]
} | null

/** Record keyed by `chainId:address` → balance entry */
export type BalanceMap = Record<string, DuneBalance>

/**
 * Fetches the user's token balances from the Dune/Sim API.
 * Requires `duneConfig.apiKey` or `duneConfig.apiBaseUrl` in RelayKitProvider.
 * Returns both the raw response and a normalized `balanceMap`.
 */
export function useDuneBalances(
  address?: string,
  network: 'mainnet' | 'testnet' = 'mainnet',
  queryOptions?: { staleTime?: number; gcTime?: number; enabled?: boolean }
) {
  const { duneConfig } = useContext(ProviderOptionsContext)

  const isEvmAddress = isAddress(address ?? '')
  const isSvmAddress = isSolanaAddress(address ?? '')

  const { data, isLoading, error } = useQuery<DuneBalanceResponse>({
    queryKey: ['useDuneBalances', address],
    queryFn: async () => {
      if (!address) return null

      const baseUrl = duneConfig?.apiBaseUrl ?? 'https://api.sim.dune.com'
      const headers: HeadersInit = duneConfig?.apiKey
        ? { 'X-Sim-Api-Key': duneConfig.apiKey }
        : {}

      let url: string
      if (isSvmAddress) {
        url = `${baseUrl}/beta/svm/balances/${address}?chain_ids=all&exclude_spam_tokens=true`
      } else {
        url = `${baseUrl}/v1/evm/balances/${address.toLowerCase()}?chain_ids=${network}&exclude_spam_tokens=true`
      }

      const res = await fetch(url, { headers })
      const json = await res.json()

      if (!json.balances) return null

      const balances = (json.balances as DuneBalance[]).filter((b) => {
        try { BigInt(b.amount); return true } catch { return false }
      })

      return { wallet_address: address, balances }
    },
    staleTime: queryOptions?.staleTime ?? 60000,
    gcTime: queryOptions?.gcTime ?? 60000,
    enabled:
      !!address &&
      (isEvmAddress || isSvmAddress) &&
      !!(duneConfig?.apiKey || duneConfig?.apiBaseUrl) &&
      (queryOptions?.enabled !== false)
  })

  /** Normalized map: `chainId:address` → balance */
  const balanceMap: BalanceMap = (data?.balances ?? []).reduce((map, b) => {
    const bal = { ...b }

    // Normalize chain_id for SVM chains
    if (!bal.chain_id && bal.chain === 'solana') bal.chain_id = SOLANA_ID
    if (!bal.chain_id && bal.chain === 'eclipse') bal.chain_id = ECLIPSE_ID

    // Normalize native token address
    if (bal.address === 'native') {
      const isSvm = bal.chain === 'solana' || bal.chain === 'eclipse'
      bal.address = isSvm ? '11111111111111111111111111111111' : zeroAddress
    }

    const chainId = bal.chain_id
    if (chainId) {
      map[`${chainId}:${bal.address}`] = bal
    }
    return map
  }, {} as BalanceMap)

  return { data, balanceMap, isLoading, error }
}
