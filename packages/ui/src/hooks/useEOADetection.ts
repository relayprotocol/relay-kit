import { useMemo, useEffect, useState, useRef } from 'react'
import type { AdaptedWallet, RelayChain } from '@relayprotocol/relay-sdk'
import useCurrencyBalance from './useCurrencyBalance.js'
import useTransactionCount from './useTransactionCount.js'

/**
 * Hook to detect if a wallet is an EOA and return the appropriate explicitDeposit flag
 * Includes checks for zero native balance and low transaction count
 * Only runs detection when evm chain and wallet supports EOA detection
 */
const useEOADetection = (
  wallet?: AdaptedWallet,
  chainId?: number,
  chainVmType?: string,
  fromChain?: RelayChain,
  userAddress?: string,
  fromBalance?: bigint,
  isFromNative?: boolean
): boolean | undefined => {
  const [detectionState, setDetectionState] = useState<{
    value: boolean | undefined
    conditionKey: string
  }>({ value: undefined, conditionKey: '' })

  const walletRef = useRef<AdaptedWallet | undefined>(wallet)
  const walletId = useRef<number>(0)

  if (walletRef.current !== wallet) {
    walletRef.current = wallet
    walletId.current += 1
  }

  const shouldRunSafetyChecks = Boolean(
    chainVmType === 'evm' && !isFromNative && userAddress && fromChain
  )

  // get native balance
  const { value: nativeBalance, isLoading: isLoadingNativeBalance } =
    useCurrencyBalance({
      chain: fromChain,
      address: userAddress,
      currency: fromChain?.currency?.address
        ? (fromChain.currency.address as string)
        : undefined,
      enabled: shouldRunSafetyChecks,
      wallet
    })

  // get transaction count
  const { data: transactionCount, isLoading: isLoadingTransactionCount } =
    useTransactionCount({
      address: userAddress,
      chainId: chainId,
      enabled: shouldRunSafetyChecks
    })

  const isLoadingSafetyChecks = Boolean(
    shouldRunSafetyChecks &&
      (isLoadingNativeBalance || isLoadingTransactionCount)
  )

  // Calculate safety check conditions
  const effectiveNativeBalance = isFromNative ? fromBalance : nativeBalance
  const hasZeroNativeBalance =
    shouldRunSafetyChecks && effectiveNativeBalance === 0n
  const hasLowTransactionCount =
    shouldRunSafetyChecks &&
    transactionCount !== undefined &&
    transactionCount <= 1

  const conditionKey = `${wallet?.vmType}:${chainVmType}:${!!wallet?.isEOA}:${chainId}:${walletId.current}:${hasZeroNativeBalance}:${hasLowTransactionCount}`

  const shouldDetect = useMemo(() => {
    return (
      chainId !== undefined &&
      (!wallet || wallet?.vmType === 'evm') &&
      chainVmType === 'evm' &&
      !hasZeroNativeBalance &&
      !hasLowTransactionCount
    )
  }, [
    wallet?.vmType,
    chainId,
    chainVmType,
    hasZeroNativeBalance,
    hasLowTransactionCount
  ])

  // Synchronously return undefined when conditions change
  const explicitDeposit = useMemo(() => {
    if (isLoadingSafetyChecks) {
      return undefined
    }

    // force explicit deposit for zero native balance or low transaction count
    if (hasZeroNativeBalance || hasLowTransactionCount) {
      return true
    }

    return detectionState.conditionKey !== conditionKey || !shouldDetect
      ? undefined
      : detectionState.value
  }, [
    conditionKey,
    shouldDetect,
    detectionState,
    hasZeroNativeBalance,
    hasLowTransactionCount,
    isLoadingSafetyChecks
  ])

  useEffect(() => {
    setDetectionState({ value: undefined, conditionKey })

    if (!shouldDetect) {
      return
    }

    const detectEOA = async () => {
      const baseEventData = {
        chain_id: chainId,
        address: userAddress,
        wallet_type: wallet?.vmType
      }

      try {
        if (!wallet || !wallet?.isEOA) {
          setDetectionState((current) =>
            current.conditionKey === conditionKey
              ? { value: false, conditionKey }
              : current
          )
          return
        }

        const timeoutMs = 2500
        const timeoutError = new Error('EOA_DETECTION_TIMEOUT')
        let timeoutId: ReturnType<typeof setTimeout> | undefined

        const startTime = performance.now()

        try {
          const eoaResult = await Promise.race([
            wallet.isEOA(chainId!),
            new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => {
                reject(timeoutError)
              }, timeoutMs)
            })
          ])

          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          const { isEOA, isEIP7702Delegated } = eoaResult
          const explicitDepositValue = !isEOA || isEIP7702Delegated

          setDetectionState((current) =>
            current.conditionKey === conditionKey
              ? { value: explicitDepositValue, conditionKey }
              : current
          )
        } catch (eoaError: any) {
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          const duration = performance.now() - startTime
          const isTimeout = eoaError === timeoutError

          if (isTimeout) {
            console.error('[EOA Detection] timeout', {
              ...baseEventData,
              error_type: 'timeout',
              duration_ms: Math.round(duration)
            })
          } else {
            console.error('[EOA Detection] error', {
              ...baseEventData,
              error_type: 'error',
              duration_ms: Math.round(duration),
              error_message: eoaError?.message || 'Unknown error',
              error_name: eoaError?.name
            })
          }

          setDetectionState((current) =>
            current.conditionKey === conditionKey
              ? { value: true, conditionKey }
              : current
          )
        }
      } catch (error: any) {
        console.error('[EOA Detection] error', {
          ...baseEventData,
          error_type: 'error',
          error_message: error?.message || 'Unknown error',
          error_name: error?.name
        })

        setDetectionState((current) =>
          current.conditionKey === conditionKey
            ? { value: true, conditionKey }
            : current
        )
      }
    }

    detectEOA()
  }, [conditionKey, shouldDetect, wallet, chainId, userAddress])

  if (!shouldDetect && chainVmType === 'evm') {
    return explicitDeposit ?? true
  }

  return explicitDeposit
}

export default useEOADetection
