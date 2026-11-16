import { useQuery, type QueryClient } from '@tanstack/react-query'
import { isSolanaTokenAccount, type RelayChain } from '@relayprotocol/relay-sdk'
import { isValidAddress } from '../utils/address.js'

const queryOptions = (rpcUrl: string, address: string) => ({
  queryKey: ['useSolanaTokenAccount', rpcUrl, address],
  queryFn: ({ signal }: { signal?: AbortSignal }) =>
    isSolanaTokenAccount(rpcUrl, address, { signal }),
  retry: false
})

const shouldCheck = (chain?: RelayChain, address?: string) =>
  Boolean(
    chain?.vmType === 'svm' &&
      address &&
      isValidAddress(chain.vmType, address, chain.id)
  )

/**
 * Imperatively checks whether an address on an SVM chain is a token account.
 * Fails closed: throws when the address cannot be checked.
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
    if (!chain!.httpRpcUrl) {
      throw new Error('Missing RPC URL')
    }
    return await queryClient.fetchQuery(
      queryOptions(chain!.httpRpcUrl, address!)
    )
  } catch {
    throw new Error('Could not verify the recipient address, try again')
  }
}

/**
 * Checks whether an address on an SVM chain (Solana, Eclipse) is a token account rather than a wallet.
 * Keyed on the address so results are never stale; fails closed when the lookup errors, times out or has no RPC.
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
