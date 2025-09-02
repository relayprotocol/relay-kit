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
    return !!(
      wallet?.isEOA &&
      protocolVersion === 'preferV2' &&
      chainId &&
      wallet?.vmType === 'evm' &&
      chainVmType === 'evm'
    )
  }, [wallet?.isEOA, wallet?.vmType, protocolVersion, chainId, chainVmType])

  // Synchronously return undefined when conditions change
  const explicitDeposit = useMemo(() => {
    if (detectionState.conditionKey !== conditionKey || !shouldDetect) {
      return undefined
    }

    return detectionState.value
  }, [conditionKey, shouldDetect, detectionState])

  useEffect(() => {
    setDetectionState({ value: undefined, conditionKey })

    if (!shouldDetect) {
      return
    }

    const detectEOA = async () => {
      try {
        const isEOA = await wallet!.isEOA!(chainId!)
        const explicitDepositValue = !isEOA

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
