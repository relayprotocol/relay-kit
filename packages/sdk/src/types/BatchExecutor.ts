import type { Address, Hex, PublicClient } from 'viem'

export type BatchCall = {
  to: Address
  value: bigint
  data: Hex
}

export type BatchExecutorConfig = {
  /** Contract address of the batch executor (e.g., Calibur) */
  address: Address

  /** ABI for the batch executor contract */
  abi: readonly Record<string, unknown>[]

  /** Default gas overhead for origin chain gasless transactions (e.g., 80_000 for Calibur) */
  originGasOverhead?: number

  /** EIP-712 types for the signed batch call */
  eip712Types: Record<
    string,
    | Array<{ name: string; type: string }>
    | readonly { readonly name: string; readonly type: string }[]
  >

  /** EIP-712 primary type name */
  eip712PrimaryType: string

  /** EIP-712 domain salt */
  salt: Hex

  /** Build the EIP-712 domain for signing */
  buildSignDomain: (
    chainId: number,
    verifyingContract: Address
  ) => {
    name: string
    version: string
    chainId: bigint
    verifyingContract: Address
    salt: Hex
  }

  /** Build the EIP-712 message to sign */
  buildSignMessage: (
    calls: BatchCall[],
    nonce: bigint
  ) => Record<string, unknown>

  /** Encode the execute calldata from the signed message + wrapped signature */
  encodeExecute: (
    signedMessage: Record<string, unknown>,
    wrappedSignature: Hex
  ) => Hex

  /** Read the current nonce from the executor contract */
  getNonce: (publicClient: PublicClient, userAddress: Address) => Promise<bigint>
}
