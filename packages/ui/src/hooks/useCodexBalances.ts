import { formatUnits, isAddress, zeroAddress } from 'viem'
import { ProviderOptionsContext } from '../providers/RelayKitProvider.js'
import { useContext } from 'react'
import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'
import { eclipse, isSolanaAddress, solana } from '../utils/solana.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import useRelayClient from './useRelayClient.js'

export type WalletBalance = {
  chain_id: number
  address: string
  amount: string
  symbol: string
  decimals: number
  price_usd?: number
  value_usd?: number
}

export type WalletBalanceResponse = {
  balances: WalletBalance[]
} | null

export type BalanceMap = Record<string, WalletBalance>

export type CodexConfig = {
  apiBaseUrl?: string
  apiKey?: string
}

export const CODEX_SVM_NETWORK_ID = 1399811149

const SOLANA_NATIVE_ADDRESS = '11111111111111111111111111111111'
// zero address + EIP-7528 placeholder — indexers use either for native entries
const EVM_NATIVE_ALIASES = [
  zeroAddress,
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  'native'
]

const MAX_BALANCES = 200
const PAGE_LIMIT = 100
// Codex prices thinly-traded junk that removeScams misses — below this pool
// liquidity a token's usd value is treated as unrealizable and stripped
const MIN_LIQUIDITY_USD = 1000

const BALANCES_QUERY = `query WalletBalances($input: BalancesInput!) {
  balances(input: $input) {
    cursor
    items {
      balance
      balanceUsd
      tokenPriceUsd
      liquidityUsd
      tokenAddress
      networkId
      token {
        symbol
        decimals
        isScam
      }
    }
  }
}`

type CodexBalanceItem = {
  balance: string
  balanceUsd?: string | null
  tokenPriceUsd?: string | null
  liquidityUsd?: string | null
  tokenAddress: string
  networkId: number
  token?: {
    symbol?: string | null
    decimals?: number | null
    isScam?: boolean | null
  } | null
}

export type SvmNativeChain = {
  chainId: number
  rpcUrl: string
  symbol: string
  decimals: number
  priceToken?: {
    address: string
    networkId: number
  }
}

// Codex doesn't index native SVM assets — price them via equivalent indexed tokens
const SVM_NATIVE_PRICE_TOKENS: Record<
  number,
  { address: string; networkId: number }
> = {
  // SOL priced via wrapped SOL
  [solana.id]: {
    address: 'So11111111111111111111111111111111111111112',
    networkId: CODEX_SVM_NETWORK_ID
  },
  // eclipse gas token is ETH, priced via mainnet WETH
  [eclipse.id]: {
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    networkId: 1
  }
}

// Codex requires networks when includeNative is true; unsupported ids are ignored
export const getEvmNetworkIds = (chains?: RelayChain[]): number[] => {
  return (chains ?? [])
    .filter((chain) => chain.vmType === 'evm')
    .map((chain) => chain.id)
}

/**
 * SVM chains whose native balances come from their RPC — Codex only covers
 * Solana SPL tokens, so gas balances (SOL, eclipse ETH) are merged in manually.
 */
export const getSvmNativeChains = (chains?: RelayChain[]): SvmNativeChain[] => {
  return (chains ?? [])
    .filter((chain) => chain.vmType === 'svm')
    .flatMap((chain) =>
      chain.httpRpcUrl &&
      chain.currency?.symbol &&
      chain.currency?.decimals !== undefined
        ? [
            {
              chainId: chain.id,
              rpcUrl: chain.httpRpcUrl,
              symbol: chain.currency.symbol,
              decimals: chain.currency.decimals,
              priceToken: SVM_NATIVE_PRICE_TOKENS[chain.id]
            }
          ]
        : []
    )
}

const fetchSvmNativeBalances = async (
  address: string,
  chains: SvmNativeChain[]
): Promise<Array<{ chain: SvmNativeChain; amount: bigint } | null>> => {
  return Promise.all(
    chains.map(async (chain) => {
      try {
        const response = await fetch(chain.rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [address]
          })
        })
        const data = await response.json()
        if (data.error) {
          return null
        }
        return { chain, amount: BigInt(data.result?.value ?? 0) }
      } catch (e) {
        return null
      }
    })
  )
}

const NATIVE_PRICES_QUERY = `query NativePrices($inputs: [GetPriceInput!]!) {
  getTokenPrices(inputs: $inputs) {
    address
    networkId
    priceUsd
  }
}`

const fetchSvmNativePrices = async (
  apiUrl: string,
  config: CodexConfig,
  chains: SvmNativeChain[]
): Promise<Record<string, number>> => {
  const inputs = chains.flatMap((chain) =>
    chain.priceToken ? [chain.priceToken] : []
  )
  if (!inputs.length) {
    return {}
  }
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: config.apiKey } : {})
      },
      body: JSON.stringify({
        query: NATIVE_PRICES_QUERY,
        variables: { inputs }
      })
    })
    const json = await response.json()
    const prices: Record<string, number> = {}
    json.data?.getTokenPrices?.forEach(
      (
        price: {
          address: string
          networkId: number
          priceUsd?: number | null
        } | null
      ) => {
        if (price?.priceUsd !== undefined && price?.priceUsd !== null) {
          prices[`${price.networkId}:${price.address}`] = price.priceUsd
        }
      }
    )
    return prices
  } catch (e) {
    return {}
  }
}

const normalizeAddress = (networkId: number, tokenAddress: string): string => {
  if (networkId === CODEX_SVM_NETWORK_ID) {
    return tokenAddress === 'native' ? SOLANA_NATIVE_ADDRESS : tokenAddress
  }
  return EVM_NATIVE_ALIASES.includes(tokenAddress.toLowerCase())
    ? zeroAddress
    : tokenAddress.toLowerCase()
}

const toNumber = (value?: string | null): number | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const fetchCodexBalances = async (
  address: string,
  config: CodexConfig,
  networks: number[],
  svmNativeChains?: SvmNativeChain[]
): Promise<WalletBalanceResponse> => {
  const apiUrl = `${config.apiBaseUrl ?? 'https://graph.codex.io'}/graphql`
  const items: CodexBalanceItem[] = []
  let cursor: string | null = null

  while (items.length < MAX_BALANCES) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: config.apiKey } : {})
      },
      body: JSON.stringify({
        query: BALANCES_QUERY,
        variables: {
          input: {
            walletAddress: address,
            includeNative: true,
            removeScams: true,
            sortBy: 'USD_VALUE',
            sortDirection: 'DESC',
            limit: PAGE_LIMIT,
            networks,
            ...(cursor ? { cursor } : {})
          }
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch balances for ${address}`)
    }

    const json = await response.json()
    if (json.errors?.length) {
      throw new Error(
        json.errors[0]?.message ?? `Failed to fetch balances for ${address}`
      )
    }

    const page = json.data?.balances
    if (!page?.items?.length) {
      break
    }
    items.push(...page.items)
    cursor = page.cursor
    if (!cursor) {
      break
    }
  }

  const balances = items.reduce<WalletBalance[]>((balances, item) => {
    const decimals = item.token?.decimals
    const symbol = item.token?.symbol
    if (typeof decimals !== 'number' || !symbol || item.token?.isScam) {
      return balances
    }
    try {
      BigInt(item.balance)
    } catch (e) {
      return balances
    }

    const address = normalizeAddress(item.networkId, item.tokenAddress)
    const isNative =
      address === zeroAddress || address === SOLANA_NATIVE_ADDRESS
    let price_usd = toNumber(item.tokenPriceUsd)
    let value_usd = toNumber(item.balanceUsd)
    const liquidityUsd = toNumber(item.liquidityUsd)
    if (
      !isNative &&
      liquidityUsd !== undefined &&
      (liquidityUsd < MIN_LIQUIDITY_USD ||
        (value_usd !== undefined && value_usd > liquidityUsd))
    ) {
      price_usd = undefined
      value_usd = undefined
    }

    balances.push({
      chain_id:
        item.networkId === CODEX_SVM_NETWORK_ID ? solana.id : item.networkId,
      address,
      amount: item.balance,
      symbol,
      decimals,
      price_usd,
      value_usd
    })
    return balances
  }, [])

  if (svmNativeChains?.length) {
    const [nativeBalances, nativePrices] = await Promise.all([
      fetchSvmNativeBalances(address, svmNativeChains),
      fetchSvmNativePrices(apiUrl, config, svmNativeChains)
    ])
    nativeBalances.forEach((native) => {
      if (!native) {
        return
      }
      const priceToken = native.chain.priceToken
      const priceUsd = priceToken
        ? nativePrices[`${priceToken.networkId}:${priceToken.address}`]
        : undefined
      const existing = balances.find(
        (balance) =>
          balance.chain_id === native.chain.chainId &&
          balance.address === SOLANA_NATIVE_ADDRESS
      )
      if (existing) {
        const price = existing.price_usd ?? priceUsd
        existing.amount = native.amount.toString()
        if (price !== undefined) {
          existing.price_usd = price
          existing.value_usd =
            price * Number(formatUnits(native.amount, existing.decimals))
        }
      } else if (native.amount > BigInt(0)) {
        balances.push({
          chain_id: native.chain.chainId,
          address: SOLANA_NATIVE_ADDRESS,
          amount: native.amount.toString(),
          symbol: native.chain.symbol,
          decimals: native.chain.decimals,
          price_usd: priceUsd,
          value_usd:
            priceUsd !== undefined
              ? priceUsd *
                Number(formatUnits(native.amount, native.chain.decimals))
              : undefined
        })
      }
    })
  }

  return { balances }
}

type QueryType = typeof useQuery<
  WalletBalanceResponse,
  DefaultError,
  WalletBalanceResponse,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

export default (address?: string, queryOptions?: Partial<QueryOptions>) => {
  const providerOptions = useContext(ProviderOptionsContext)
  const relayClient = useRelayClient()
  const codexConfig = providerOptions.codexConfig
  const queryKey = ['useCodexBalances', address]
  const isEvmAddress = isAddress(address ?? '')
  const isSvmAddress = isSolanaAddress(address ?? '')
  const networks = isSvmAddress
    ? [CODEX_SVM_NETWORK_ID]
    : getEvmNetworkIds(relayClient?.chains)

  const response = (useQuery as QueryType)({
    queryKey,
    queryFn: () => {
      if (!address || (!isSvmAddress && !isEvmAddress)) {
        return null
      }

      return fetchCodexBalances(
        address,
        codexConfig ?? {},
        networks,
        isSvmAddress ? getSvmNativeChains(relayClient?.chains) : undefined
      )
    },
    ...queryOptions,
    enabled:
      address !== undefined &&
      networks.length > 0 &&
      (codexConfig?.apiKey !== undefined ||
        codexConfig?.apiBaseUrl !== undefined) &&
      queryOptions?.enabled &&
      (isSvmAddress || isEvmAddress)
  })

  // Keys are lowercased to match consumer lookups; balance.address keeps the
  // mint's original case for the tokens api
  const balanceMap = response?.data?.balances?.reduce((balanceMap, balance) => {
    balanceMap[`${balance.chain_id}:${balance.address.toLowerCase()}`] = balance
    return balanceMap
  }, {} as BalanceMap)

  return { ...response, balanceMap, queryKey } as ReturnType<QueryType> & {
    balanceMap: typeof balanceMap
    queryKey: (string | undefined)[]
  }
}
