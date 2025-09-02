import { useMemo, useEffect, useState } from 'react'
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
  // Internal state to track the detected EOA value
  const [detectedExplicitDeposit, setDetectedExplicitDeposit] = useState<boolean | undefined>(
    undefined
  )
  
  // Track the conditions for which we detected the current value
  const [detectionConditions, setDetectionConditions] = useState<{
    walletVmType?: string
    chainVmType?: string
    walletIsEOA?: boolean
    protocolVersion?: string
    chainId?: number
  }>({})

  const shouldDetect = useMemo(() => {
    // Check if wallet and chain VM types are compatible
    const isWalletChainCompatible = wallet?.vmType === 'evm' && chainVmType === 'evm'
    
    const result = !!(
      wallet?.isEOA &&
      protocolVersion === 'preferV2' &&
      chainId &&
      isWalletChainCompatible
    )
    console.log('🎯 useEOADetection shouldDetect:', {
      hasWalletIsEOA: !!wallet?.isEOA,
      walletVmType: wallet?.vmType,
      chainVmType,
      isWalletChainCompatible,
      protocolVersion,
      isPreferV2: protocolVersion === 'preferV2',
      chainId,
      shouldDetect: result
    })
    return result
  }, [wallet?.isEOA, wallet?.vmType, protocolVersion, chainId, chainVmType])

  // Synchronously return undefined when conditions change
  const explicitDeposit = useMemo(() => {
    const currentConditions = {
      walletVmType: wallet?.vmType,
      chainVmType,
      walletIsEOA: !!wallet?.isEOA,
      protocolVersion,
      chainId
    }
    
    // If conditions changed, immediately return undefined (synchronous reset)
    const conditionsChanged = (
      detectionConditions.walletVmType !== currentConditions.walletVmType ||
      detectionConditions.chainVmType !== currentConditions.chainVmType ||
      detectionConditions.walletIsEOA !== currentConditions.walletIsEOA ||
      detectionConditions.protocolVersion !== currentConditions.protocolVersion ||
      detectionConditions.chainId !== currentConditions.chainId
    )
    
    if (conditionsChanged || !shouldDetect) {
      console.log('🎯 Synchronous reset: conditions changed or shouldDetect=false, returning undefined immediately')
      return undefined
    }
    
    // Conditions are stable and we should detect, return the detected value
    return detectedExplicitDeposit
  }, [
    wallet?.vmType,
    chainVmType,
    wallet?.isEOA,
    protocolVersion,
    chainId,
    shouldDetect,
    detectedExplicitDeposit,
    detectionConditions
  ])

  useEffect(() => {
    console.log('🎯 EOA Detection useEffect triggered:', {
      shouldDetect,
      walletVmType: wallet?.vmType,
      walletAddress: wallet?.address,
      chainId
    })

    const currentConditions = {
      walletVmType: wallet?.vmType,
      chainVmType,
      walletIsEOA: !!wallet?.isEOA,
      protocolVersion,
      chainId
    }
    
    // Update conditions tracking
    setDetectionConditions(currentConditions)
    
    // Reset detected value when conditions change
    setDetectedExplicitDeposit(undefined)

    if (!shouldDetect) {
      console.log(
        '🎯 EOA detection skipped - shouldDetect is false, keeping explicitDeposit undefined'
      )
      return
    }

    console.log('🎯 Starting EOA detection for explicitDeposit calculation...')

    const detectEOA = async () => {
      try {
        const isEOA = await wallet!.isEOA!(chainId!)
        const explicitDepositValue = !isEOA

        console.log('🎯 EOA Detection Hook Result:', {
          isEOA,
          explicitDepositValue,
          logic: 'explicitDeposit = !isEOA',
          meaning: isEOA
            ? 'EOA -> explicitDeposit=false (single tx)'
            : 'Smart Wallet -> explicitDeposit=true (batched tx)'
        })

        // Only set the value if conditions haven't changed since we started detection
        setDetectedExplicitDeposit(explicitDepositValue)
      } catch (error) {
        console.error('🎯 EOA Detection Hook Error:', error)
        setDetectedExplicitDeposit(undefined)
      }
    }

    detectEOA()
  }, [wallet?.isEOA, wallet?.vmType, protocolVersion, chainId, chainVmType, shouldDetect])

  return explicitDeposit
}

export default useEOADetection
