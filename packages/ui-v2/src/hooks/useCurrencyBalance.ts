import {
  type Address,
  isAddress,
  zeroAddress,
  erc20Abi
} from 'viem'
import { useBalance, useReadContract } from 'wagmi'
import type { QueryKey } from '@tanstack/react-query'
import type { AdaptedWallet, RelayChain } from '@relayprotocol/relay-sdk'

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
  isError: boolean | null
  error: Error | null
  isDuneBalance: boolean
  hasPendingBalance?: boolean
}

/**
 * Fetches the balance of any token (native ETH or ERC20) for a given address on a given chain.
 *
 * For EVM chains: uses wagmi's useBalance / useReadContract.
 * For non-EVM chains: returns undefined (balance fetching for SVM/BVM is handled
 * by the full relay-kit-ui package — this simplified version covers the EVM case
 * needed for the demo and standard usage).
 *
 * The `isDuneBalance` flag indicates when the balance comes from the Dune API
 * (Solana chains), which may need more aggressive cache invalidation.
 */
export function useCurrencyBalance({
  chain,
  address,
  currency,
  enabled = true,
  refreshInterval = 60_000,
}: UseBalanceProps): UseCurrencyBalanceData {
  const isErc20Currency = Boolean(currency && currency !== zeroAddress)
  const isValidEvmAddress = Boolean(address && isAddress(address as string))
  const isEvmChain = chain?.vmType === 'evm'

  const {
    data: ethBalance,
    queryKey: ethBalanceQueryKey,
    isLoading: ethBalanceIsLoading,
    isError: ethError,
    error: ethErrorObj
  } = useBalance({
    chainId: chain?.id,
    address: address as Address,
    query: {
      enabled: Boolean(
        !isErc20Currency &&
          isEvmChain &&
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
        isErc20Currency &&
          isEvmChain &&
          isValidEvmAddress &&
          enabled
      ),
      refetchInterval: refreshInterval
    }
  })

  if (isEvmChain) {
    const value = isErc20Currency ? erc20Balance : ethBalance?.value
    const error = isErc20Currency ? erc20Error : ethErrorObj
    const isError = isErc20Currency ? isErc20Error : ethError
    const queryKey = isErc20Currency ? erc20BalanceQueryKey : ethBalanceQueryKey
    const isLoading = isErc20Currency ? erc20BalanceIsLoading : ethBalanceIsLoading
    return {
      value,
      queryKey,
      isLoading,
      isError,
      error: error as Error | null,
      isDuneBalance: false
    }
  }

  // Non-EVM: return undefined balance with a stable empty query key
  return {
    value: undefined,
    queryKey: ['currency-balance-unsupported', chain?.id, address],
    isLoading: false,
    isError: false,
    error: null,
    isDuneBalance: false
  }
}
