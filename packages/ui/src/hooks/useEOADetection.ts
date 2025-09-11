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
    return (
      wallet !== undefined &&
      protocolVersion === 'preferV2' &&
      chainId !== undefined &&
      wallet?.vmType === 'evm' &&
      chainVmType === 'evm'
    )
  }, [wallet?.vmType, protocolVersion, chainId, chainVmType])

  // Synchronously return undefined when conditions change
  const explicitDeposit = useMemo(() => {
    return detectionState.conditionKey !== conditionKey || !shouldDetect
      ? undefined
      : detectionState.value
  }, [conditionKey, shouldDetect, detectionState])

  useEffect(() => {
    setDetectionState({ value: undefined, conditionKey })

    if (!shouldDetect) {
      return
    }

    const detectEOA = async () => {
      try {
        if (!wallet?.isEOA) {
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
