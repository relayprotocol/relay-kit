import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  type SendOptions,
  type TransactionSignature
} from '@solana/web3.js'
import {
  LogLevel,
  getClient,
  type AdaptedWallet,
  type TransactionStepItem
} from '@reservoir0x/relay-sdk'

/**
 * Adapts a Solana wallet to work with the Relay SDK
 * @param walletAddress - The public key address of the Solana wallet
 * @param chainId - The chain ID for the Solana network (e.g., 101 for mainnet, 102 for testnet)
 * @param connection - The Solana web3.js Connection instance for interacting with the network
 * @param signAndSendTransaction - Function to sign and send a transaction, returning a promise with the transaction signature
 * @param payerKey - Optional public key of the account that will pay for transaction fees (defaults to walletAddress)
 * @returns An AdaptedWallet object that conforms to the Relay SDK interface
 */
export const adaptSolanaWallet = (
  walletAddress: string,
  chainId: number,
  connection: Connection,
  signAndSendTransaction: (
    transaction: VersionedTransaction,
    options?: SendOptions,
    instructions?: TransactionInstruction[],
    rawInstructions?: TransactionStepItem['data']['instructions']
  ) => Promise<{
    signature: TransactionSignature
  }>,
  payerKey?: string
): AdaptedWallet => {
  let _chainId = chainId
  const getChainId = async () => {
    return _chainId
  }

  return {
    vmType: 'svm',
    getChainId,
    address: async () => {
      return walletAddress
    },
    handleSignMessageStep: async () => {
      throw new Error('Message signing not implemented for Solana')
    },
    handleSendTransactionStep: async (_chainId, stepItem) => {
      const client = getClient()

      const instructions =
        stepItem?.data?.instructions?.map(
          (i) =>
            new TransactionInstruction({
              keys: i.keys.map((k) => ({
                isSigner: k.isSigner,
                isWritable: k.isWritable,
                pubkey: new PublicKey(k.pubkey)
              })),
              programId: new PublicKey(i.programId),
              data: Buffer.from(i.data, 'hex')
            })
        ) ?? []

      const messageV0 = new TransactionMessage({
        payerKey: new PublicKey(payerKey ?? walletAddress),
        instructions,
        recentBlockhash: await connection
          .getLatestBlockhash()
          .then((b) => b.blockhash)
      }).compileToV0Message(
        await Promise.all(
          stepItem?.data?.addressLookupTableAddresses?.map(
            async (address: string) =>
              await connection
                .getAddressLookupTable(new PublicKey(address))
                .then((res) => res.value as AddressLookupTableAccount)
          ) ?? []
        )
      )

      const transaction = new VersionedTransaction(messageV0)
      const signature = await signAndSendTransaction(
        transaction,
        undefined,
        instructions,
        stepItem.data.instructions
      )

      client.log(
        ['Transaction Signature obtained', signature],
        LogLevel.Verbose
      )

      return signature.signature
    },
    handleConfirmTransactionStep: async (txHash) => {
      // Solana doesn't have a concept of replaced transactions
      // So we don't need to handle onReplaced and onCancelled

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed')

      const result = await connection.confirmTransaction({
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
        signature: txHash
      })

      if (result.value.err) {
        throw new Error(`Transaction failed: ${result.value.err}`)
      }

      return {
        blockHash: result.context.slot.toString(),
        blockNumber: result.context.slot,
        txHash
      }
    },
    switchChain: (chainId: number) => {
      _chainId = chainId
      return new Promise((res) => res())
    }
  }
}
