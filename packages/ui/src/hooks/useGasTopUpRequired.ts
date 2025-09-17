import type { Token } from '../types/index.js'
import useCurrencyBalance from '../hooks/useCurrencyBalance.js'
import { type RelayChain } from '@relayprotocol/relay-sdk'
import { useTokenPrice } from '@relayprotocol/relay-kit-hooks'
import { useRelayClient } from '../hooks/index.js'

export default (
  chain?: RelayChain,
  fromChain?: RelayChain,
  token?: Token,
  address?: string,
  balanceThresholdUsd: string = '10',
  topUpAmountUsd: string = '2'
): {
  required: boolean
  amount?: bigint
  amountUsd?: string
  balance?: bigint
} => {
  const client = useRelayClient()
  const isErc20Currency = token && token.address !== chain?.currency?.address
  const enabled =
    token !== undefined &&
    address !== undefined &&
    chain !== undefined &&
    chain?.currency?.address !== undefined &&
    chain?.currency?.supportsBridging &&
    chain?.vmType === 'evm' &&
    chain.id !== fromChain?.id &&
    chain.id !== 169 &&
    isErc20Currency
  const { value: gasBalance } = useCurrencyBalance({
    chain,
    address,
    currency: chain?.currency?.address
      ? (chain.currency.address as string)
      : undefined,
    enabled
  })

  const { data: usdTokenPriceResponse } = useTokenPrice(
    client?.baseApiUrl,
    {
      address: chain?.currency?.address ?? '',
      chainId: chain?.id ?? 0,
      referrer: client?.source
    },
    {
      refetchInterval: 60000 * 5, //5 minutes
      refetchOnWindowFocus: false,
      enabled
    }
  )

  if (enabled && gasBalance !== undefined && usdTokenPriceResponse?.price) {
    const tokenDecimals = chain?.currency?.decimals ?? 18
    const balanceThreshold =
      (BigInt(Math.floor(+balanceThresholdUsd * 10 ** 6)) *
        BigInt(10 ** tokenDecimals)) /
      BigInt(Math.floor(usdTokenPriceResponse.price * 10 ** 6))

    const topUpAmount =
      (BigInt(Math.floor(+topUpAmountUsd * 10 ** 6)) *
        BigInt(10 ** tokenDecimals)) /
      BigInt(Math.floor(usdTokenPriceResponse.price * 10 ** 6))
    const requiresTopUp = balanceThreshold > gasBalance

    return {
      required: requiresTopUp,
      amount: requiresTopUp ? topUpAmount : undefined,
      amountUsd: requiresTopUp ? topUpAmountUsd : undefined,
      balance: gasBalance
    }
  } else {
    return {
      required: false,
      amount: undefined,
      amountUsd: undefined,
      balance: undefined
    }
  }
}
