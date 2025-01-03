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
  }>
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
        payerKey: new PublicKey(walletAddress),
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
