import { useMemo, useEffect, useState, useRef } from 'react'
import type { AdaptedWallet, RelayChain } from '@relayprotocol/relay-sdk'
import useCurrencyBalance from './useCurrencyBalance.js'
import useTransactionCount from './useTransactionCount.js'

/**
 * Hook to detect if a wallet is an EOA and return the appropriate explicitDeposit flag
 * Includes checks for zero native balance and low transaction count
 * Only runs detection when protocol version is 'preferV2' and wallet supports EOA detection
 */
const useEOADetection = (
  wallet?: AdaptedWallet,
  protocolVersion?: string,
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

  // get native balance
  const { value: nativeBalance, isLoading: isLoadingNativeBalance } =
    useCurrencyBalance({
      chain: fromChain,
      address: userAddress,
      currency: fromChain?.currency?.address
        ? (fromChain.currency.address as string)
        : undefined,
      enabled: Boolean(
        userAddress &&
          fromChain &&
          !isFromNative &&
          protocolVersion === 'preferV2'
      ),
      wallet
    })

  // get transaction count
  const { data: transactionCount, isLoading: isLoadingTransactionCount } =
    useTransactionCount({
      address: userAddress,
      chainId: chainId,
      enabled: Boolean(
        userAddress && !isFromNative && protocolVersion === 'preferV2'
      )
    })

  const isLoadingSafetyChecks = Boolean(
    protocolVersion === 'preferV2' &&
      !isFromNative &&
      (isLoadingNativeBalance || isLoadingTransactionCount)
  )

  // Calculate safety check conditions
  const effectiveNativeBalance = isFromNative ? fromBalance : nativeBalance
  const hasZeroNativeBalance = effectiveNativeBalance === 0n
  const hasLowTransactionCount =
    transactionCount !== undefined && transactionCount <= 1

  const conditionKey = `${wallet?.vmType}:${chainVmType}:${!!wallet?.isEOA}:${protocolVersion}:${chainId}:${walletId.current}:${hasZeroNativeBalance}:${hasLowTransactionCount}`

  const shouldDetect = useMemo(() => {
    return (
      protocolVersion === 'preferV2' &&
      chainId !== undefined &&
      (!wallet || wallet?.vmType === 'evm') &&
      chainVmType === 'evm' &&
      !hasZeroNativeBalance &&
      !hasLowTransactionCount
    )
  }, [
    wallet?.vmType,
    protocolVersion,
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
      try {
        if (!wallet || !wallet?.isEOA) {
          setDetectionState((current) =>
            current.conditionKey === conditionKey
              ? { value: false, conditionKey }
              : current
          )
          return
        }

        const eoaResult = await wallet.isEOA(chainId!)
        const { isEOA, isEIP7702Delegated } = eoaResult
        const explicitDepositValue = !isEOA || isEIP7702Delegated

        setDetectionState((current) =>
          current.conditionKey === conditionKey
            ? { value: explicitDepositValue, conditionKey }
            : current
        )
      } catch (error) {
        setDetectionState((current) =>
          current.conditionKey === conditionKey
            ? { value: undefined, conditionKey }
            : current
        )
      }
    }

    detectEOA()
  }, [conditionKey, shouldDetect, wallet, chainId])

  return explicitDeposit
}

export default useEOADetection
