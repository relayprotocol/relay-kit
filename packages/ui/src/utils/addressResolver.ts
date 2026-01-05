import type { ChainVM } from '@relayprotocol/relay-sdk'
import { isAddress } from 'viem'
import { resolveLighterAddress } from './lighter.js'

export type AddressResolverResult = {
  address: string | null
  error: string | null
}

type ResolverConfig = {
  canResolve: (input: string, vmType?: ChainVM) => boolean
  resolve: (input: string) => Promise<string | null>
  errorMessage: string
  successLabel: string
}

const resolvers: Partial<Record<ChainVM, ResolverConfig>> = {
  lvm: {
    canResolve: (input) => isAddress(input),
    resolve: resolveLighterAddress,
    errorMessage: 'No Lighter account found for this EVM address',
    successLabel: 'Lighter Account ID'
  }
  // Add more VM resolvers here as needed:
  // svm: { canResolve: ..., resolve: ..., errorMessage: ..., successLabel: ... }
}

export function getAddressResolver(vmType?: ChainVM) {
  return vmType ? resolvers[vmType] : undefined
}

export async function resolveAddress(
  input: string,
  vmType?: ChainVM
): Promise<AddressResolverResult> {
  const resolver = getAddressResolver(vmType)

  if (!resolver || !resolver.canResolve(input, vmType)) {
    return { address: null, error: null }
  }

  const address = await resolver.resolve(input)
  if (address) {
    return { address, error: null }
  }
  return { address: null, error: resolver.errorMessage }
}
