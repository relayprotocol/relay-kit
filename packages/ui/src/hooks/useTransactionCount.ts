import { type Address, isAddress } from 'viem'
import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'

type UseTransactionCountProps = {
  address?: Address | string
  chainId?: number
  enabled?: boolean
  refreshInterval?: number
}

type UseTransactionCountData = {
  data?: number
  isLoading: boolean
  isError: boolean
  error: Error | null
}

const useTransactionCount = ({
  address,
  chainId,
  enabled = true,
  refreshInterval = 60000
}: UseTransactionCountProps): UseTransactionCountData => {
  const publicClient = usePublicClient({ chainId })
  const isValidAddress = address && isAddress(address)

  const {
    data,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['transactionCount', chainId, address],
    queryFn: async () => {
      if (!publicClient || !address) {
        throw new Error('Missing publicClient or address')
      }
      
      return await publicClient.getTransactionCount({
        address: address as Address
      })
    },
    enabled: Boolean(
      enabled &&
      publicClient &&
      isValidAddress &&
      chainId !== undefined
    ),
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: false
  })

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null
  }
}

export default useTransactionCount