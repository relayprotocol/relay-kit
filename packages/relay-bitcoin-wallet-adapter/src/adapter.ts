import {
  LogLevel,
  axios,
  getClient,
  type AdaptedWallet
} from '@relayprotocol/relay-sdk'
import * as bitcoin from 'bitcoinjs-lib'

type DynamicSignPsbtParams = {
  allowedSighash: number[] // Only allow SIGHASH_ALL
  unsignedPsbtBase64: string // The unsigned PSBT in Base64 format
  signature: Array<{
    address: string // The address that is signing
    signingIndexes: number[] // The index of the input being signed
  }>
}

export const adaptBitcoinWallet = (
  walletAddress: string,
  signPsbt: (
    address: string,
    psbt: bitcoin.Psbt,
    dynamicParams: DynamicSignPsbtParams
  ) => Promise<string>
): AdaptedWallet => {
  return {
    vmType: 'bvm',
    getChainId: async () => {
      return 8253038
    },
    address: async () => {
      return walletAddress
    },
    handleSignMessageStep: async () => {
      throw new Error('Message signing not implemented for Bitcoin')
    },
    handleSendTransactionStep: async (_chainId, stepItem) => {
      const client = getClient()

      const psbtHex = stepItem.data.psbt as string

      const psbt = bitcoin.Psbt.fromHex(psbtHex, {
        network: bitcoin.networks.bitcoin
      })

      const signature = psbt.txInputs.map((_input, index) => {
        return {
          address: walletAddress,
          signingIndexes: [index]
        }
      })

      const dynamicParams: DynamicSignPsbtParams = {
        allowedSighash: [0, 1],
        unsignedPsbtBase64: psbt.toBase64(), // The unsigned PSBT in Base64 format
        signature
      }

      const signedPsbt = bitcoin.Psbt.fromBase64(
        await signPsbt(walletAddress, psbt, dynamicParams)
      )
      signedPsbt.finalizeAllInputs()

      const rawTransaction = signedPsbt.extractTransaction().toHex()
      client.log(['BTC Transaction', rawTransaction], LogLevel.Verbose)
      const mempoolResponse = await axios
        .post('https://mempool.space/api/tx', rawTransaction)
        .then((r) => r.data)
      client.log(['Transaction Broadcasted', mempoolResponse], LogLevel.Verbose)
      return mempoolResponse
    },
    //Bitcoin txs can take 10m or more to finalize, in the case of chains that have a long block time (2m+), the SDK will skip waiting for confirmation
    handleConfirmTransactionStep: async () => {
      throw 'Not implemented'
    },
    //@ts-ignore
    switchChain: (chainId: number) => {
      throw 'Not yet implemented'
    }
  }
}
