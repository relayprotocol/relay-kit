import { useMemo } from 'react'
import { useTokenList } from '@relayprotocol/relay-kit-hooks'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import useRelayClient from './useRelayClient.js'
import { addressesEqual, isValidAddress } from '../utils/address.js'

/**
 * Checks whether an address is a known token contract on the given chain.
 * Checks the currencies attached to the chain config first, then falls back
 * to the currencies API. Keyed on the address so results are never stale;
 * fails open on API errors.
 */
export default function useKnownTokenContract(
  chain?: RelayChain,
  address?: string,
  enabled: boolean = true
) {
  const relayClient = useRelayClient()

  const checkEnabled = Boolean(
    enabled &&
      chain &&
      address &&
      isValidAddress(chain.vmType, address, chain.id)
  )

  // Check currencies already attached to the chain config
  const localTokenContract = useMemo(() => {
    if (!checkEnabled || !chain) {
      return undefined
    }
    return [
      chain.currency,
      ...(chain.erc20Currencies ?? []),
      ...(chain.featuredTokens ?? []),
      ...(chain.solverCurrencies ?? [])
    ].find((currency) =>
      addressesEqual(chain.vmType ?? 'evm', currency?.address, address)
    )
  }, [checkEnabled, chain, address])

  // Fall back to the currencies API
  const { data: currencies, isLoading } = useTokenList(
    relayClient?.baseApiUrl,
    checkEnabled && chain && !localTokenContract
      ? {
          chainIds: [chain.id],
          address,
          limit: 1,
          referrer: relayClient?.source
        }
      : undefined
  )

  const tokenContract =
    localTokenContract ??
    (checkEnabled
      ? currencies?.find((currency) =>
          addressesEqual(chain?.vmType ?? 'evm', currency.address, address)
        )
      : undefined)

  return {
    /** The matching currency when the address is a known token contract */
    tokenContract,
    isKnownTokenContract: Boolean(tokenContract),
    /** True while the lookup is in flight with no result yet */
    isChecking: checkEnabled && !localTokenContract && isLoading,
    /** Whether the lookup is active for the given chain/address */
    enabled: checkEnabled
  }
}
