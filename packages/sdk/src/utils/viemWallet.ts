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
    isEOA: async (chainId) => {
      if (!wallet.account) {
        console.log('🔍 EOA Detection: No wallet account available')
        return false
      }

      const walletAddress = wallet.account.address
      console.log('🔍 EOA Detection Started:', {
        address: walletAddress,
        chainId
      })

      try {
        console.log('🏗️ Checking deployed code using eth_getCode...')
        const client = getClient()
        const chain = client.chains.find((chain) => chain.id === chainId)
        const rpcUrl = chain?.httpRpcUrl

        if (!chain) {
          throw new Error(`Chain ${chainId} not found in relay client`)
        }

        // Create a simple public client for the getCode call
        const viemClient = createPublicClient({
          chain: chain?.viemChain,
          transport: rpcUrl ? http(rpcUrl) : http()
        })

        console.log('🌐 Making eth_getCode call to:', {
          rpcUrl,
          chainId,
          address: wallet.account.address
        })

        let code
        try {
          code = await viemClient.getCode({
            address: wallet.account.address
          })
          console.log('📡 Raw getCode response:', { code })
        } catch (getCodeError) {
          console.error('💥 getCode call failed:', {
            error: getCodeError instanceof Error ? getCodeError.message : String(getCodeError),
            rpcUrl,
            chainId,
            address: wallet.account.address
          })
          // Re-throw to be caught by outer try/catch
          throw getCodeError
        }

        const hasCode = code && code !== '0x'
        console.log('🏗️ Code check:', {
          code: code && code.length > 10 ? `${code.slice(0, 10)}...` : code,
          codeLength: code && code.length,
          hasCode
        })

        const isEOA = !hasCode
        const reason = hasCode
          ? 'Has deployed code -> Smart Wallet (including EIP-7702 delegated)'
          : 'No deployed code -> EOA'

        console.log('✅ EOA Detection Complete:', {
          address: walletAddress,
          chainId,
          hasCode,
          isEOA,
          reason,
          explicitDepositWillBe: !isEOA
        })

        return isEOA
      } catch (error) {
        console.error('❌ EOA Detection Error:', {
          address: walletAddress,
          chainId,
          error: error instanceof Error ? error.message : String(error)
        })
        // If we can't determine, assume it's not an EOA (safer default)
        return false
      }
    }
  }
}
