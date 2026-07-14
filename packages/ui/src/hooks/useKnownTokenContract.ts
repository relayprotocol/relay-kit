import { useTokenList } from '@relayprotocol/relay-kit-hooks'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import useRelayClient from './useRelayClient.js'
import { addressesEqual, isValidAddress } from '../utils/address.js'

/**
 * Checks whether an address is a known token contract on the given chain
 * via the currencies API. Keyed on the address so results are never stale;
 * fails open on API errors.
 */
export default function useKnownTokenContract(
  chain?: RelayChain,
  address?: string,
  enabled: boolean = true
) {
  const relayClient = useRelayClient()

  const queryEnabled = Boolean(
    enabled &&
      chain &&
      address &&
      isValidAddress(chain.vmType, address, chain.id)
  )

  const { data: currencies, isLoading } = useTokenList(
    relayClient?.baseApiUrl,
    queryEnabled && chain
      ? {
          chainIds: [chain.id],
          address,
          limit: 1,
          referrer: relayClient?.source
        }
      : undefined
  )

  const tokenContract = queryEnabled
    ? currencies?.find((currency) =>
        addressesEqual(chain?.vmType ?? 'evm', currency.address, address)
      )
    : undefined

  return {
    /** The matching currency when the address is a known token contract */
    tokenContract,
    isKnownTokenContract: Boolean(tokenContract),
    /** True while the lookup is in flight with no result yet */
    isChecking: queryEnabled && isLoading,
    /** Whether the lookup is active for the given chain/address */
    enabled: queryEnabled
  }
}
