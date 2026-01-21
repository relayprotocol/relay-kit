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

// Cache for expensive RPC calls (code, balance, tx count)
interface EOACacheEntry {
  code?: { value: string | undefined; timestamp: number }
  balance?: { value: bigint; timestamp: number }
  txCount?: { value: number; timestamp: number }
}

const CACHE_DURATION_MS = 2 * 60 * 1000 // 2 minutes
const eoaCache = new Map<string, EOACacheEntry>()

function getCacheKey(address: string, chainId: number): string {
  return `${address}-${chainId}`
}

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
    ): Promise<{
      isEOA: boolean
      isEIP7702Delegated: boolean
    }> => {
      if (!wallet.account) {
        return {
          isEOA: false,
          isEIP7702Delegated: false
        }
      }

      try {
        const address = wallet.account.address
        const cacheKey = getCacheKey(address, chainId)
        const now = Date.now()

        // Get or create cache entry for this address+chain
        let cacheEntry = eoaCache.get(cacheKey)
        if (!cacheEntry) {
          cacheEntry = {}
          eoaCache.set(cacheKey, cacheEntry)
        }

        // Always fetch capabilities fresh (wallet-specific, not cacheable)
        const getSmartWalletCapabilities = async () => {
          let _hasSmartWalletCapabilities = false
          try {
            const capabilities = await wallet.getCapabilities({
              account: wallet.account,
              chainId
            })

            _hasSmartWalletCapabilities = Boolean(
              capabilities?.atomicBatch?.supported ||
                capabilities?.paymasterService?.supported ||
                capabilities?.auxiliaryFunds?.supported ||
                capabilities?.sessionKeys?.supported
            )
          } catch (capabilitiesError) {}
          return _hasSmartWalletCapabilities
        }

        // Get code with caching
        const getCode = async () => {
          // Check cache first
          console.log('CHECKING CODE CACHE')
          if (
            cacheEntry &&
            cacheEntry?.code &&
            now - cacheEntry?.code.timestamp < CACHE_DURATION_MS
          ) {
            console.log('CODE CACHE HIT')
            const code = cacheEntry!.code.value
            const hasCode = Boolean(code && code !== '0x')
            const isEIP7702Delegated = Boolean(
              code && code.toLowerCase().startsWith('0xef01')
            )
            return { hasCode, isEIP7702Delegated }
          }

          // Fetch from RPC
          console.log('FETCHING CODE FROM RPC')
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

          try {
            const _code = await viemClient.getCode({ address })

            // Cache the result
            cacheEntry!.code = { value: _code, timestamp: now }

            const hasCode = Boolean(_code && _code !== '0x')
            const isEIP7702Delegated = Boolean(
              _code && _code.toLowerCase().startsWith('0xef01')
            )
            return { hasCode, isEIP7702Delegated }
          } catch (getCodeError) {
            throw getCodeError
          }
        }

        // Get balance with caching
        const getNativeBalance = async () => {
          // Check cache first
          console.log('CHECKING BALANCE CACHE')
          if (
            cacheEntry &&
            cacheEntry?.balance &&
            now - cacheEntry?.balance.timestamp < CACHE_DURATION_MS
          ) {
            console.log('BALANCE CACHE HIT')
            return cacheEntry?.balance.value
          }

          // Fetch from RPC
          console.log('FETCHING BALANCE FROM RPC')
          const client = getClient()
          const chain = client.chains.find((chain) => chain.id === chainId)
          const rpcUrl = chain?.httpRpcUrl

          if (!chain) {
            return BigInt(0)
          }

          const viemClient = createPublicClient({
            chain: chain?.viemChain,
            transport: rpcUrl ? http(rpcUrl) : http()
          })

          try {
            console.log('FETCHING BALANCE FROM RPC')
            const balance = await viemClient.getBalance({ address })
            console.log('BALANCE FETCHED FROM RPC')
            // Cache the result
            cacheEntry!.balance = { value: balance, timestamp: now }
            return balance
          } catch (error) {
            return BigInt(0)
          }
        }

        // Get transaction count with caching
        const getTransactionCount = async () => {
          // Check cache first
          console.log('CHECKING TRANSACTION COUNT CACHE')
          if (
            cacheEntry &&
            cacheEntry?.txCount &&
            now - cacheEntry?.txCount.timestamp < CACHE_DURATION_MS
          ) {
            console.log('TRANSACTION COUNT CACHE HIT')
            return cacheEntry?.txCount.value
          }

          // Fetch from RPC
          console.log('FETCHING TRANSACTION COUNT FROM RPC')
          const client = getClient()
          const chain = client.chains.find((chain) => chain.id === chainId)
          const rpcUrl = chain?.httpRpcUrl

          if (!chain) {
            return 0
          }

          const viemClient = createPublicClient({
            chain: chain?.viemChain,
            transport: rpcUrl ? http(rpcUrl) : http()
          })

          try {
            const txCount = await viemClient.getTransactionCount({ address })
            // Cache the result
            cacheEntry!.txCount = { value: txCount, timestamp: now }
            return txCount
          } catch (error) {
            return 0
          }
        }

        const [
          hasSmartWalletCapabilitiesResult,
          getCodeResult,
          nativeBalanceResult,
          transactionCountResult
        ] = await Promise.allSettled([
          getSmartWalletCapabilities(),
          getCode(),
          getNativeBalance(),
          getTransactionCount()
        ])

        const hasSmartWalletCapabilities =
          hasSmartWalletCapabilitiesResult.status === 'fulfilled'
            ? hasSmartWalletCapabilitiesResult.value
            : false
        const { hasCode, isEIP7702Delegated } =
          getCodeResult.status === 'fulfilled'
            ? getCodeResult.value
            : { hasCode: false, isEIP7702Delegated: false }
        const nativeBalance =
          nativeBalanceResult.status === 'fulfilled'
            ? nativeBalanceResult.value
            : BigInt(0)
        const transactionCount =
          transactionCountResult.status === 'fulfilled'
            ? transactionCountResult.value
            : 0

        let isSmartWallet =
          hasSmartWalletCapabilities || hasCode || isEIP7702Delegated

        // If balance is zero or transaction count is <= 1, it's likely a smart wallet
        if (nativeBalance === BigInt(0) || transactionCount <= 1) {
          isSmartWallet = true
        }

        return { isEOA: !isSmartWallet, isEIP7702Delegated }
      } catch (error) {
        // On error, default to explicit deposit (isEOA: false) for safety
        return {
          isEOA: false,
          isEIP7702Delegated: false
        }
      }
    }
  }
}
