import type {
  MoonPayCryptoCurrency,
  MoonPayFiatCurrency
} from '../hooks/useMoonPayCurrencies.js'
import defaultMoonPayCurrencies from '../constants/moonPayCurrencies.js'
import { bitcoin } from './bitcoin.js'
import { solana } from './solana.js'

export function convertSupportedCurrencies(
  currencies?: [MoonPayCryptoCurrency | MoonPayFiatCurrency] | null
) {
  if (currencies) {
    return currencies
      .filter(
        (currency) =>
          (currency.type === 'crypto' &&
            currency.metadata.chainId &&
            currency.metadata.contractAddress) ||
          currency.code === 'btc' ||
          currency.code.includes('sol')
      )
      .map((currency) => {
        currency = currency as MoonPayCryptoCurrency
        let chainId = currency.metadata.chainId
        let contractAddress = currency.metadata.contractAddress
        if (currency.code === 'btc') {
          chainId = `${bitcoin.id}`
          contractAddress = 'bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8'
        } else if (currency.code.includes('sol')) {
          chainId = `${solana.id}`
          if (currency.code === 'sol') {
            contractAddress = '11111111111111111111111111111111'
          }
        } else {
          contractAddress = contractAddress.toLowerCase()
        }
        return {
          name: currency.name,
          type: currency.type,
          notAllowedCountries: currency.notAllowedCountries,
          notAllowedUSStates: currency.notAllowedUSStates,
          code: currency.code,
          chainId: chainId,
          contractAddress: contractAddress
        }
      })
  } else {
    return defaultMoonPayCurrencies
  }
}
