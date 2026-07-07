import {
  type Address,
  type GetBalanceErrorType,
  isAddress,
  type ReadContractErrorType,
  zeroAddress
} from 'viem'
import { useBalance, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import type { QueryKey } from '@tanstack/react-query'
import type { AdaptedWallet, RelayChain } from '@relayprotocol/relay-sdk'
import useSolanaBalance from './useSolanaBalance.js'
import useBitcoinBalance from './useBitcoinBalance.js'
import useAdaptedWalletBalance from './useAdaptedWalletBalance.js'
import { isValidAddress } from '../utils/address.js'
import useHyperliquidBalance from './useHyperliquidBalance.js'
import useHyperliquidAccountMode from './useHyperliquidAccountMode.js'
import useTronBalance from '../hooks/useTronBalance.js'
import useTonBalance from '../hooks/useTonBalance.js'

type UseBalanceProps = {
  chain?: RelayChain
  address?: Address | string
  currency?: Address | string
  enabled?: boolean
  refreshInterval?: number
  wallet?: AdaptedWallet
}

type UseCurrencyBalanceData = {
  value?: bigint
  queryKey: QueryKey
  isLoading: boolean
  isError: boolean | GetBalanceErrorType | null
  error: boolean | ReadContractErrorType | Error | null
  hasPendingBalance?: boolean
}

// Handle fetching the balance of both native eth and erc20s
const useCurrencyBalance = ({
  chain,
  address,
  currency,
  enabled = true,
  refreshInterval = 60000,
  wallet
}: UseBalanceProps): UseCurrencyBalanceData => {
  const isErc20Currency = currency && currency !== zeroAddress
  const isValidEvmAddress = address && isAddress(address)
  const adaptedWalletBalanceIsEnabled =
    wallet?.getBalance !== undefined && wallet.vmType === chain?.vmType

  const adaptedWalletBalance = useAdaptedWalletBalance({
    wallet,
    chain,
    address,
    currency,
    enabled: enabled && adaptedWalletBalanceIsEnabled,
    refreshInterval
  })

  const {
    data: ethBalance,
    queryKey: ethBalanceQueryKey,
    isLoading: ethBalanceIsLoading,
    isError: ethError,
    error: isEthError
  } = useBalance({
    chainId: chain?.id,
    address: address as Address,
    query: {
      enabled: Boolean(
        !adaptedWalletBalanceIsEnabled &&
          !isErc20Currency &&
          chain &&
          chain.vmType === 'evm' &&
          isValidEvmAddress &&
          enabled
      ),
      refetchInterval: refreshInterval
    }
  })

  const {
    data: erc20Balance,
    queryKey: erc20BalanceQueryKey,
    isLoading: erc20BalanceIsLoading,
    isError: isErc20Error,
    error: erc20Error
  } = useReadContract({
    chainId: chain?.id,
    address: currency as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address as Address] : undefined,
    query: {
      enabled: Boolean(
        !adaptedWalletBalanceIsEnabled &&
          isErc20Currency &&
          chain &&
          chain.vmType === 'evm' &&
          isValidEvmAddress &&
          enabled
      ),
      refetchInterval: refreshInterval
    }
  })

  const _isValidAddress = isValidAddress(chain?.vmType, address, chain?.id)

  const solanaBalance = useSolanaBalance(
    address,
    currency ? (currency as string) : undefined,
    chain?.httpRpcUrl,
    {
      enabled: Boolean(
        !adaptedWalletBalanceIsEnabled &&
          chain &&
          chain.vmType === 'svm' &&
          address &&
          _isValidAddress &&
          enabled
      ),
      staleTime: refreshInterval,
      gcTime: refreshInterval
    }
  )

  const bitcoinBalances = useBitcoinBalance(address, {
    enabled: Boolean(
      !adaptedWalletBalanceIsEnabled &&
        chain &&
        chain.vmType === 'bvm' &&
        address &&
        _isValidAddress &&
        enabled
    ),
    gcTime: refreshInterval,
    staleTime: refreshInterval
  })

  const isHypevm = chain?.vmType === 'hypevm'

  const { data: hyperliquidAccountMode } = useHyperliquidAccountMode(
    address,
    Boolean(
      !adaptedWalletBalanceIsEnabled &&
        isHypevm &&
        address &&
        _isValidAddress &&
        enabled
    )
  )

  const hyperliquidBalance = useHyperliquidBalance(
    address,
    currency as string,
    hyperliquidAccountMode,
    {
      enabled: Boolean(
        !adaptedWalletBalanceIsEnabled &&
          isHypevm &&
          address &&
          _isValidAddress &&
          enabled
      ),
      gcTime: refreshInterval,
      staleTime: refreshInterval
    }
  )

  const tronBalance = useTronBalance(address, currency, {
    enabled: Boolean(
      !adaptedWalletBalanceIsEnabled &&
        chain &&
        chain.vmType === 'tvm' &&
        address &&
        _isValidAddress &&
        enabled
    ),
    gcTime: refreshInterval,
    staleTime: refreshInterval
  })

  const tonBalance = useTonBalance(address, chain?.httpRpcUrl, {
    enabled: Boolean(
      !adaptedWalletBalanceIsEnabled &&
        chain &&
        chain.vmType === 'tonvm' &&
        chain.httpRpcUrl &&
        address &&
        _isValidAddress &&
        enabled
    ),
    gcTime: refreshInterval,
    staleTime: refreshInterval
  })

  if (adaptedWalletBalanceIsEnabled) {
    return {
      value: adaptedWalletBalance.data,
      queryKey: adaptedWalletBalance.queryKey,
      isLoading: adaptedWalletBalance.isLoading,
      isError: adaptedWalletBalance.isError,
      error: adaptedWalletBalance.error
    }
  } else if (chain?.vmType === 'evm') {
    const value = isErc20Currency ? erc20Balance : ethBalance?.value
    const error = isErc20Currency ? erc20Error : ethError
    const isError = isErc20Currency ? isErc20Error : isEthError
    const queryKey = isErc20Currency ? erc20BalanceQueryKey : ethBalanceQueryKey
    const isLoading = isErc20Currency
      ? erc20BalanceIsLoading
      : ethBalanceIsLoading
    return { value, queryKey, isLoading, isError, error }
  } else if (chain?.vmType === 'svm') {
    return {
      value: _isValidAddress ? solanaBalance.balance : undefined,
      queryKey: solanaBalance.queryKey,
      isLoading: solanaBalance.isLoading,
      isError: solanaBalance.isError,
      error: solanaBalance.error
    }
  } else if (chain?.vmType === 'bvm') {
    if (_isValidAddress) {
      return {
        value:
          currency && bitcoinBalances.balance
            ? bitcoinBalances.balance
            : undefined,
        queryKey: bitcoinBalances.queryKey,
        isLoading: bitcoinBalances.isLoading,
        isError: bitcoinBalances.isError,
        error: bitcoinBalances.error,

        hasPendingBalance:
          bitcoinBalances.data?.pendingBalance &&
          bitcoinBalances.data?.pendingBalance > 0n
            ? true
            : false
      }
    } else {
      return {
        value: undefined,
        queryKey: bitcoinBalances.queryKey,
        isLoading: bitcoinBalances.isLoading,
        isError: bitcoinBalances.isError,
        error: bitcoinBalances.error,

        hasPendingBalance: false
      }
    }
  } else if (chain?.vmType === 'hypevm') {
    return {
      value: hyperliquidBalance.balance,
      queryKey: hyperliquidBalance.queryKey,
      isLoading: hyperliquidBalance.isLoading,
      isError: hyperliquidBalance.isError,
      error: hyperliquidBalance.error
    }
  } else if (chain?.vmType === 'tvm') {
    return {
      value: tronBalance.balance,
      queryKey: tronBalance.queryKey,
      isLoading: tronBalance.isLoading,
      isError: tronBalance.isError,
      error: tronBalance.error
    }
  } else if (chain?.vmType === 'tonvm') {
    return {
      value: tonBalance.balance,
      queryKey: tonBalance.queryKey,
      isLoading: tonBalance.isLoading,
      isError: tonBalance.isError,
      error: tonBalance.error
    }
  } else {
    return {
      value: undefined,
      queryKey: [],
      isLoading: false,
      isError: false,
      error: null
    }
  }
}

export default useCurrencyBalance
