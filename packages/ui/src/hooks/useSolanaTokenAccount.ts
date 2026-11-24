import { useQuery, type QueryClient } from '@tanstack/react-query'
import { isSolanaTokenAccount, type RelayChain } from '@relayprotocol/relay-sdk'
import { isSolanaPublicKey } from '../utils/solana.js'

const queryOptions = (rpcUrl: string, address: string) => ({
  queryKey: ['useSolanaTokenAccount', rpcUrl, address],
  queryFn: ({ signal }: { signal?: AbortSignal }) =>
    isSolanaTokenAccount(rpcUrl, address, { signal }),
  retry: false
})

const shouldCheck = (chain?: RelayChain, address?: string) =>
  Boolean(chain?.vmType === 'svm' && address && isSolanaPublicKey(address))

/**
 * Imperatively checks whether an address on an SVM chain is a token account.
 * Only a confirmed token account returns true; unverified addresses are confirmed by the user in the address modal.
 */
export async function checkSolanaTokenAccount(
  queryClient: QueryClient,
  chain?: RelayChain,
  address?: string
): Promise<boolean> {
  if (!shouldCheck(chain, address) || !chain!.httpRpcUrl) {
    return false
  }
  try {
    return await queryClient.fetchQuery(
      queryOptions(chain!.httpRpcUrl, address!)
    )
  } catch {
    return false
  }
}

/**
 * Checks whether an address on an SVM chain (Solana, Eclipse) is a token account rather than a wallet.
 * Keyed on the address so results are never stale. Reports addresses it could not check (lookup error, timeout or no RPC) as unverified.
 */
export default function useSolanaTokenAccount(
  chain?: RelayChain,
  address?: string,
  enabled: boolean = true
) {
  const checkEnabled = enabled && shouldCheck(chain, address)
  const rpcUrl = chain?.httpRpcUrl

  const { data, isLoading, isError } = useQuery({
    ...queryOptions(rpcUrl ?? '', address ?? ''),
    enabled: checkEnabled && Boolean(rpcUrl)
  })

  return {
    isTokenAccount: checkEnabled && data === true,
    /** True while the lookup is in flight with no result yet */
    isChecking: checkEnabled && isLoading,
    /** True when the address needs a check that could not complete */
    isUnverified: checkEnabled && (!rpcUrl || isError)
  }
}
