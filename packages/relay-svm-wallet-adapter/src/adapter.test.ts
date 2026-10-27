import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Connection } from '@solana/web3.js'
import {
  createClient,
  MAINNET_RELAY_API,
  type Execute,
  type TransactionStepItem
} from '@relayprotocol/relay-sdk'

import { adaptSolanaWallet } from './adapter.js'

const SOLANA_CHAIN_ID = 792703809
const ECLIPSE_CHAIN_ID = 9286185
const ARBITRARY_SVM_CHAIN_ID = 123456

const WALLET_ADDRESS = '11111111111111111111111111111111'
const BLOCKHASH = '11111111111111111111111111111111'
const SIGNATURE = '5'.repeat(88)

const STEP_ITEM = {
  status: 'incomplete',
  data: {
    instructions: [],
    addressLookupTableAddresses: []
  }
} as unknown as TransactionStepItem

const STEP = {
  id: 'deposit',
  action: 'transfer',
  description: '',
  kind: 'transaction'
} as unknown as Execute['steps'][0]

const makeConnection = () => {
  const connection = {
    getLatestBlockhash: vi.fn(async () => ({
      blockhash: BLOCKHASH,
      lastValidBlockHeight: 100
    })),
    getAddressLookupTable: vi.fn(async () => ({ value: null })),
    confirmTransaction: vi.fn(async () => ({
      context: { slot: 42 },
      value: { err: null }
    }))
  }
  return connection as typeof connection & Connection
}

const makeWallet = (chainId: number) => {
  const connection = makeConnection()
  const signAndSendTransaction = vi.fn(async () => ({ signature: SIGNATURE }))
  const wallet = adaptSolanaWallet(
    WALLET_ADDRESS,
    chainId,
    connection,
    signAndSendTransaction
  )
  return { wallet, connection, signAndSendTransaction }
}

beforeEach(() => {
  createClient({ baseApiUrl: MAINNET_RELAY_API, chains: [] })
})

describe.each([
  ['Solana', SOLANA_CHAIN_ID, ECLIPSE_CHAIN_ID],
  ['Eclipse', ECLIPSE_CHAIN_ID, SOLANA_CHAIN_ID],
  ['an arbitrary SVM chain id', ARBITRARY_SVM_CHAIN_ID, ECLIPSE_CHAIN_ID]
])('adaptSolanaWallet bound to %s', (_name, boundChainId, otherChainId) => {
  it('reports the chain id it was constructed with', async () => {
    const { wallet } = makeWallet(boundChainId)
    expect(wallet.vmType).toBe('svm')
    await expect(wallet.getChainId()).resolves.toBe(boundChainId)
  })

  it('resolves switchChain to the bound chain', async () => {
    const { wallet } = makeWallet(boundChainId)
    await expect(wallet.switchChain(boundChainId)).resolves.toBeUndefined()
    await expect(wallet.getChainId()).resolves.toBe(boundChainId)
  })

  it('rejects switchChain to another SVM chain without relabeling', async () => {
    const { wallet } = makeWallet(boundChainId)
    await expect(wallet.switchChain(otherChainId)).rejects.toThrow('Cannot switch to an invalid svm chain id')
    await expect(wallet.getChainId()).resolves.toBe(boundChainId)
  })

  it('aborts a cross-chain send before compiling or signing', async () => {
    const { wallet, connection, signAndSendTransaction } =
      makeWallet(boundChainId)
    await wallet.switchChain(otherChainId).catch(() => {})

    await expect(
      wallet.handleSendTransactionStep(otherChainId, STEP_ITEM, STEP)
    ).rejects.toThrow('Cannot switch to an invalid svm chain id')
    expect(connection.getLatestBlockhash).not.toHaveBeenCalled()
    expect(signAndSendTransaction).not.toHaveBeenCalled()
  })

  it('signs and sends on the bound chain', async () => {
    const { wallet, connection, signAndSendTransaction } =
      makeWallet(boundChainId)

    await expect(
      wallet.handleSendTransactionStep(boundChainId, STEP_ITEM, STEP)
    ).resolves.toBe(SIGNATURE)
    expect(connection.getLatestBlockhash).toHaveBeenCalledOnce()
    expect(signAndSendTransaction).toHaveBeenCalledOnce()
  })

  it('refuses to confirm against another SVM chain', async () => {
    const { wallet, connection } = makeWallet(boundChainId)

    await expect(
      wallet.handleConfirmTransactionStep(
        SIGNATURE,
        otherChainId,
        () => {},
        () => {}
      )
    ).rejects.toThrow('Cannot switch to an invalid svm chain id')
    expect(connection.confirmTransaction).not.toHaveBeenCalled()
  })

  it('confirms on the bound chain', async () => {
    const { wallet, connection } = makeWallet(boundChainId)

    await expect(
      wallet.handleConfirmTransactionStep(
        SIGNATURE,
        boundChainId,
        () => {},
        () => {}
      )
    ).resolves.toMatchObject({ blockNumber: 42, txHash: SIGNATURE })
    expect(connection.confirmTransaction).toHaveBeenCalledOnce()
  })
})
