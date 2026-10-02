import { useQuery, type QueryClient } from '@tanstack/react-query'
import { isSolanaTokenAccount, type RelayChain } from '@relayprotocol/relay-sdk'
import { isValidAddress } from '../utils/address.js'

const queryOptions = (rpcUrl: string, address: string) => ({
  queryKey: ['useSolanaTokenAccount', rpcUrl, address],
  queryFn: ({ signal }: { signal?: AbortSignal }) =>
    isSolanaTokenAccount(rpcUrl, address, signal),
  retry: 1
})

const shouldCheck = (chain?: RelayChain, address?: string) =>
  Boolean(
    chain?.vmType === 'svm' &&
      chain.httpRpcUrl &&
      address &&
      isValidAddress(chain.vmType, address, chain.id)
  )

/**
 * Imperatively checks whether an address is a Solana token account; fails open on RPC errors.
 */
export async function checkSolanaTokenAccount(
  queryClient: QueryClient,
  chain?: RelayChain,
  address?: string
): Promise<boolean> {
  if (!shouldCheck(chain, address)) {
    return false
  }
  try {
    return await queryClient.fetchQuery(
      queryOptions(chain!.httpRpcUrl!, address!)
    )
  } catch {
    return false
  }
}

/**
 * Checks whether an address on an SVM chain is a token account rather than a wallet.
 * Keyed on the address so results are never stale; fails open on RPC errors.
 */
export default function useSolanaTokenAccount(
  chain?: RelayChain,
  address?: string,
  enabled: boolean = true
) {
  const checkEnabled = enabled && shouldCheck(chain, address)

  const { data, isLoading } = useQuery({
    ...queryOptions(chain?.httpRpcUrl ?? '', address ?? ''),
    enabled: checkEnabled
  })

  return {
    isTokenAccount: checkEnabled && data === true,
    /** True while the lookup is in flight with no result yet */
    isChecking: checkEnabled && isLoading
  }
}
