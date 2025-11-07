import type { CurrencyList } from '@relayprotocol/relay-kit-hooks'
import type { Token } from '../types/index.js'
import { ASSETS_RELAY_API } from '@relayprotocol/relay-sdk'
import type { paths, RelayChain } from '@relayprotocol/relay-sdk'

type ApiCurrency = NonNullable<
  paths['/chains']['get']['responses']['200']['content']['application/json']['chains']
>[0]['currency']

export const convertApiCurrencyToToken = (
  currency: ApiCurrency | undefined | null,
  chainId: number
): Token => {
  return {
    chainId: Number(chainId),
    address: currency?.address ?? '',
    name: currency?.name ?? '',
    symbol: currency?.symbol ?? '',
    decimals: currency?.decimals ?? 0,
    logoURI: `${ASSETS_RELAY_API}/icons/currencies/${
      currency?.id ?? currency?.symbol?.toLowerCase() ?? chainId
    }.png`,
    verified: true
  }
}

export const findBridgableToken = (chain?: RelayChain, token?: Token) => {
  if (chain && token && token.chainId === chain.id) {
    const toCurrencies = [
      ...(chain?.erc20Currencies ?? []),
      chain.currency ?? undefined
    ]
    const toCurrency = toCurrencies.find((c) => c?.address === token?.address)

    if (!toCurrency || !toCurrency.supportsBridging) {
      const supportedToCurrency = toCurrencies.find((c) => c?.supportsBridging)
      if (supportedToCurrency) {
        return convertApiCurrencyToToken(supportedToCurrency, chain.id)
      }
    } else {
      return token
    }
  }
  return null
}

/**
 * Generates a standard token image URL from symbol or metadata
 */
export const generateTokenImageUrl = (token: { 
  symbol?: string, 
  metadata?: { logoURI?: string } 
}): string => {
  return token.metadata?.logoURI ||
    `${ASSETS_RELAY_API}/icons/currencies/${token.symbol?.toLowerCase()}.png`
}

/**
 * Compares two tokens for equality based on chainId and address
 */
export const tokensAreEqual = (a?: Token, b?: Token): boolean => {
  if (!a && !b) return true
  if (!a || !b) return false
  return (
    a.chainId === b.chainId &&
    a.address?.toLowerCase() === b.address?.toLowerCase()
  )
}

/**
 * Normalizes token address for cross-chain consistency
 */
export const normalizeTokenAddress = (chainId: number, address: string, vmType?: string): string => {
  const normalizedAddress = vmType === 'evm' ? address.toLowerCase() : address
  return `${chainId}:${normalizedAddress}`
}

export const mergeTokenLists = (lists: (CurrencyList | undefined)[]) => {
  const mergedList: CurrencyList = []
  const seenTokens = new Set<string>()

  lists.forEach((list) => {
    if (!list) return

    list.forEach((currency) => {
      if (!currency) return

      const tokenKey = `${currency.chainId}:${currency.address?.toLowerCase()}`

      if (!seenTokens.has(tokenKey)) {
        seenTokens.add(tokenKey)
        mergedList.push(currency)
      }
    })
  })

  return mergedList
}
