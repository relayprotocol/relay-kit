import type { Hex, Address } from 'viem'
import { pad } from 'viem'

/**
 * Calibur — Uniswap's minimal batch executor for EIP-7702 delegated EOAs.
 * Deployed at the same address on all supported chains.
 * https://github.com/Uniswap/calibur
 */
export const CALIBUR_ADDRESS =
  '0x000000009B1D0aF20D8C6d0A44e162d11F9b8f00' as Address

export const CALIBUR_ABI = [
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'signedBatchedCall',
        type: 'tuple',
        components: [
          {
            name: 'batchedCall',
            type: 'tuple',
            components: [
              {
                name: 'calls',
                type: 'tuple[]',
                components: [
                  { name: 'to', type: 'address' },
                  { name: 'value', type: 'uint256' },
                  { name: 'data', type: 'bytes' }
                ]
              },
              { name: 'revertOnFailure', type: 'bool' }
            ]
          },
          { name: 'nonce', type: 'uint256' },
          { name: 'keyHash', type: 'bytes32' },
          { name: 'executor', type: 'address' },
          { name: 'deadline', type: 'uint256' }
        ]
      },
      { name: 'wrappedSignature', type: 'bytes' }
    ],
    outputs: []
  },
  {
    name: 'getSeq',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'key', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

export const CALIBUR_EIP712_TYPES = {
  SignedBatchedCall: [
    { name: 'batchedCall', type: 'BatchedCall' },
    { name: 'nonce', type: 'uint256' },
    { name: 'keyHash', type: 'bytes32' },
    { name: 'executor', type: 'address' },
    { name: 'deadline', type: 'uint256' }
  ],
  BatchedCall: [
    { name: 'calls', type: 'Call[]' },
    { name: 'revertOnFailure', type: 'bool' }
  ],
  Call: [
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' }
  ]
} as const

/** bytes32(0) — the root key hash, meaning the EOA owner's key */
export const ROOT_KEY_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex

/**
 * EIP-712 domain salt for Calibur.
 * salt = pad(implementationAddress) with left-padding to 32 bytes.
 */
export const CALIBUR_SALT = pad(CALIBUR_ADDRESS, {
  dir: 'left',
  size: 32
})
