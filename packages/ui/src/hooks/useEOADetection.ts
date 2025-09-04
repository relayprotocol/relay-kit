import { useMemo, useEffect, useState, useRef } from 'react'
import type { AdaptedWallet } from '@relayprotocol/relay-sdk'

/**
 * Hook to detect if a wallet is an EOA and return the appropriate explicitDeposit flag
 * Only runs detection when protocol version is 'preferV2' and wallet supports EOA detection
 */
const useEOADetection = (
  wallet?: AdaptedWallet,
  protocolVersion?: string,
  chainId?: number,
  chainVmType?: string
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

  const conditionKey = `${wallet?.vmType}:${chainVmType}:${!!wallet?.isEOA}:${protocolVersion}:${chainId}:${walletId.current}`

  const shouldDetect = useMemo(() => {
    const result = !!(
      wallet?.isEOA &&
      protocolVersion === 'preferV2' &&
      chainId &&
      wallet?.vmType === 'evm' &&
      chainVmType === 'evm'
    )
    console.log('[EOADetection] shouldDetect conditions:', {
      hasWalletIsEOA: !!wallet?.isEOA,
      protocolVersion,
      chainId,
      walletVmType: wallet?.vmType,
      chainVmType,
      shouldDetect: result
    })
    return result
  }, [wallet?.isEOA, wallet?.vmType, protocolVersion, chainId, chainVmType])

  // Synchronously return undefined when conditions change
  const explicitDeposit = useMemo(() => {
    const result =
      detectionState.conditionKey !== conditionKey || !shouldDetect
        ? undefined
        : detectionState.value

    console.log('[EOADetection] explicitDeposit computed:', {
      chainId,
      conditionKeyMatch: detectionState.conditionKey === conditionKey,
      shouldDetect,
      detectionStateValue: detectionState.value,
      result
    })

    return result
  }, [conditionKey, shouldDetect, detectionState, chainId])

  useEffect(() => {
    console.log('[EOADetection] useEffect triggered:', {
      conditionKey,
      shouldDetect,
      chainId,
      walletAddress: wallet?.address
    })

    setDetectionState({ value: undefined, conditionKey })

    if (!shouldDetect) {
      console.log('[EOADetection] Skipping detection - shouldDetect is false')
      return
    }

    const detectEOA = async () => {
      try {
        console.log(
          '[EOADetection] Starting EOA detection for chainId:',
          chainId
        )
        const startTime = Date.now()
        const eoaResult = await wallet!.isEOA!(chainId!)
        const duration = Date.now() - startTime

        const { isEOA, isEIP7702Delegated } = eoaResult
        const explicitDepositValue = !isEOA || isEIP7702Delegated

        console.log('[EOADetection] EOA detection completed:', {
          chainId,
          isEOA,
          isEIP7702Delegated,
          explicitDepositValue,
          duration: `${duration}ms`,
          conditionKey
        })

        setDetectionState((current) =>
          current.conditionKey === conditionKey
            ? { value: explicitDepositValue, conditionKey }
            : current
        )
      } catch (error) {
        console.error('[EOADetection] EOA detection failed:', {
          chainId,
          error: error instanceof Error ? error.message : error,
          conditionKey
        })
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
