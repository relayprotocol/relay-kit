import type { AdaptedWallet } from '../types/index.js'
import { LogLevel } from './logger.js'
import { getClient } from '../client.js'
import type { Account, Address, Hex, WalletClient } from 'viem'
import {
  createPublicClient,
  createWalletClient,
  custom,
  fallback,
  hexToBigInt,
  http
} from 'viem'

export function isViemWalletClient(
  wallet: WalletClient | AdaptedWallet
): wallet is WalletClient {
  return (
    (wallet as WalletClient).extend !== undefined &&
    (wallet as WalletClient).getPermissions !== undefined
  )
}

export const adaptViemWallet = (wallet: WalletClient): AdaptedWallet => {
  return {
    vmType: 'evm',
    getChainId: async () => {
      return wallet.getChainId()
    },
    transport: custom(wallet.transport),
    address: async () => {
      let address = wallet.account?.address
      if (!address) {
        ;[address] = await wallet.getAddresses()
      }
      return address
    },
    handleSignMessageStep: async (stepItem) => {
      const client = getClient()
      const signData = stepItem.data?.sign
      let signature: string | undefined
      if (signData) {
        if (signData.signatureKind === 'eip191') {
          client.log(['Execute Steps: Signing with eip191'], LogLevel.Verbose)
          if (signData.message.match(/0x[0-9a-fA-F]{64}/)) {
            // If the message represents a hash, we need to convert it to raw bytes first
            signature = await wallet.signMessage({
              account: wallet.account as Account,
              message: {
                raw: signData.message as Hex
              }
            })
          } else {
            signature = await wallet.signMessage({
              account: wallet.account as Account,
              message: signData.message
            })
          }
        } else if (signData.signatureKind === 'eip712') {
          const signatureData = {
            account: wallet.account as Account,
            domain: signData.domain as any,
            types: signData.types as any,
            primaryType: signData.primaryType,
            message: signData.value
          }
          client.log(
            ['Execute Steps: Signing with eip712', signatureData],
            LogLevel.Verbose
          )
          signature = await wallet.signTypedData(signatureData)
        }
      }
      return signature
    },
    handleSendTransactionStep: async (chainId, stepItem) => {
      const stepData = stepItem.data
      const client = getClient()
      const chain = getClient().chains.find(
        (chain) => chain.id === chainId
      )?.viemChain
      if (!chain) {
        throw 'Chain not found when sending transaction'
      }

      const viemClient = createWalletClient({
        account: wallet.account ?? stepData.from,
        chain,
        transport: custom(wallet.transport, { retryCount: 10, retryDelay: 200 })
      })

      return await viemClient.sendTransaction({
        chain,
        data: stepData.data,
        account: wallet.account ?? stepData.from, // use signer.account if it's defined
        to: stepData.to,
        value: hexToBigInt((stepData.value as any) || 0),
        ...(stepData.maxFeePerGas &&
          client.useGasFeeEstimations && {
            maxFeePerGas: hexToBigInt(stepData.maxFeePerGas as any)
          }),
        ...(stepData.maxPriorityFeePerGas &&
          client.useGasFeeEstimations && {
            maxPriorityFeePerGas: hexToBigInt(
              stepData.maxPriorityFeePerGas as any
            )
          }),
        ...(stepData.gas &&
          client.useGasFeeEstimations && {
            gas: hexToBigInt(stepData.gas as any)
          })
      })
    },
    handleConfirmTransactionStep: async (
      txHash,
      chainId,
      onReplaced,
      onCancelled
    ) => {
      const client = getClient()
      const chain = client.chains.find((chain) => chain.id === chainId)
      const rpcUrl = chain?.httpRpcUrl
      const viemClient = createPublicClient({
        chain: chain?.viemChain,
        transport: wallet.transport
          ? fallback(
              rpcUrl
                ? [http(rpcUrl), custom(wallet.transport), http()]
                : [custom(wallet.transport), http()]
            )
          : fallback([http(rpcUrl), http()]),
        pollingInterval: client.confirmationPollingInterval
      })

      const receipt = await viemClient.waitForTransactionReceipt({
        hash: txHash as Address,
        onReplaced: (replacement) => {
          if (replacement.reason === 'cancelled') {
            onCancelled()
            throw Error('Transaction cancelled')
          }
          onReplaced(replacement.transaction.hash)
        }
      })

      return receipt
    },
    switchChain: async (chainId: number) => {
      try {
        await wallet.switchChain({
          id: chainId
        })
        return
      } catch (e: any) {
        if (e && e?.message) {
          if (e.message.includes('does not support the requested chain')) {
            throw new Error('Wallet does not support chain')
          } else if (e.message.includes('rejected')) {
            throw e
          } else if (e.message.includes('already pending')) {
            return
          }
        }
        const client = getClient()
        const chain = client.chains.find((chain) => chain.id === chainId)
        if (!chain) {
          throw 'Chain missing from Relay Client'
        }
        try {
          await wallet.addChain({
            chain: chain?.viemChain!
          })
        } catch (e: any) {
          if (
            e instanceof Error &&
            e.name &&
            e.name === 'InternalRpcError' &&
            e.message.includes('is not a function')
          ) {
            getClient()?.log(
              [
                'Execute Steps: Detected internal RPC Error when adding a chain to the wallet',
                e
              ],
              LogLevel.Verbose
            )
            return
          } else {
            throw e
          }
        }
        return
      }
    },
    supportsAtomicBatch: async (chainId) => {
      if (!wallet.account) return false
      try {
        const capabilities = await wallet.getCapabilities({
          account: wallet.account,
          chainId
        })

        return (
          capabilities?.atomicBatch?.supported ??
          (capabilities.atomic?.status &&
            capabilities.atomic.status === 'supported')
        )
      } catch {
        return false
      }
    },
    handleBatchTransactionStep: async (chainId, items) => {
      const calls = items.map((item) => ({
        to: item.data.to,
        data: item.data.data,
        value: hexToBigInt((item.data.value as any) || 0),
        ...(item.data.maxFeePerGas && {
          maxFeePerGas: hexToBigInt(item.data.maxFeePerGas as any)
        }),
        ...(item.data.maxPriorityFeePerGas && {
          maxPriorityFeePerGas: hexToBigInt(
            item.data.maxPriorityFeePerGas as any
          )
        }),
        ...(item.data.gas && {
          gas: hexToBigInt(item.data.gas as any)
        })
      }))

      const client = getClient()
      const chain = client.chains.find(
        (chain) => chain.id === chainId
      )?.viemChain

      if (!chain) {
        throw 'Chain not found when sending transaction'
      }

      const { id } = await wallet.sendCalls({
        chain,
        account: wallet.account as Account,
        calls
      })

      return id
    },
    isEOA: async (
      chainId: number
    ): Promise<{ isEOA: boolean; isEIP7702Delegated: boolean }> => {
      if (!wallet.account) {
        return { isEOA: false, isEIP7702Delegated: false }
      }

      try {
        let hasSmartWalletCapabilities = false
        try {
          const capabilities = await wallet.getCapabilities({
            account: wallet.account,
            chainId
          })

          hasSmartWalletCapabilities = Boolean(
            capabilities?.atomicBatch?.supported ||
              capabilities?.paymasterService?.supported ||
              capabilities?.auxiliaryFunds?.supported ||
              capabilities?.sessionKeys?.supported
          )
        } catch (capabilitiesError) {}

        const client = getClient()
        const chain = client.chains.find((chain) => chain.id === chainId)
        const rpcUrl = chain?.httpRpcUrl

        if (!chain) {
          throw new Error(`Chain ${chainId} not found in relay client`)
        }

        const viemClient = createPublicClient({
          chain: chain?.viemChain,
          transport: rpcUrl ? http(rpcUrl) : http()
        })

        let code
        try {
          code = await viemClient.getCode({
            address: wallet.account.address
          })
        } catch (getCodeError) {
          throw getCodeError
        }

        const hasCode = Boolean(code && code !== '0x')
        const isEIP7702Delegated = Boolean(
          code && code.toLowerCase().startsWith('0xef01')
        )
        const isSmartWallet =
          hasSmartWalletCapabilities || hasCode || isEIP7702Delegated
        const isEOA = !isSmartWallet

        return { isEOA, isEIP7702Delegated }
      } catch (error) {
        return { isEOA: false, isEIP7702Delegated: false }
      }
    }
  }
}
