import {
  encodeFunctionData,
  type Address,
  type Hex,
  type PublicClient
} from 'viem'
import type { BatchExecutorConfig, BatchCall } from '../types/BatchExecutor.js'
import {
  CALIBUR_ADDRESS,
  CALIBUR_ABI,
  CALIBUR_EIP712_TYPES,
  CALIBUR_SALT,
  ROOT_KEY_HASH
} from '../constants/calibur.js'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

export const CALIBUR_ORIGIN_GAS_OVERHEAD = 80_000

export function createCaliburExecutor(): BatchExecutorConfig {
  return {
    address: CALIBUR_ADDRESS,
    abi: CALIBUR_ABI,
    eip712Types: CALIBUR_EIP712_TYPES,
    eip712PrimaryType: 'SignedBatchedCall',
    salt: CALIBUR_SALT,
    originGasOverhead: CALIBUR_ORIGIN_GAS_OVERHEAD,

    buildSignDomain(chainId: number, verifyingContract: Address) {
      return {
        name: 'Calibur',
        version: '1.0.0',
        chainId: BigInt(chainId),
        verifyingContract,
        salt: CALIBUR_SALT
      }
    },

    buildSignMessage(calls: BatchCall[], nonce: bigint) {
      return {
        batchedCall: {
          calls: calls.map((c) => ({ to: c.to, value: c.value, data: c.data })),
          revertOnFailure: true
        },
        nonce,
        keyHash: ROOT_KEY_HASH,
        executor: ZERO_ADDRESS,
        deadline: 0n
      }
    },

    encodeExecute(
      signedMessage: Record<string, unknown>,
      wrappedSignature: Hex
    ) {
      return encodeFunctionData({
        abi: CALIBUR_ABI,
        functionName: 'execute',
        args: [signedMessage as any, wrappedSignature]
      })
    },

    async getNonce(
      publicClient: PublicClient,
      userAddress: Address
    ): Promise<bigint> {
      try {
        const seq = await publicClient.readContract({
          address: userAddress,
          abi: CALIBUR_ABI,
          functionName: 'getSeq',
          args: [0n]
        })
        return BigInt(seq as bigint)
      } catch {
        return 0n
      }
    }
  }
}
