import type { Execute, RelayChain } from '@relayprotocol/relay-sdk'
import type { Token, LinkedWallet } from '../types/index.js'
import { NormalizedWalletName } from '../constants/walletCompatibility.js'

/**
 * Get display name for wallet from linkedWallets array using current address
 */
const getWalletDisplayName = (
  currentAddress?: string,
  linkedWallets?: LinkedWallet[]
): string => {
  if (!currentAddress || !linkedWallets) {
    return 'your wallet'
  }

  const linkedWallet = linkedWallets.find(
    (linkedWallet) =>
      currentAddress ===
        (linkedWallet.vmType === 'evm'
          ? linkedWallet.address.toLowerCase()
          : linkedWallet.address) || linkedWallet.address === currentAddress
  )

  if (!linkedWallet?.connector) {
    return 'your wallet'
  }

  // Use normalized wallet name if available, otherwise use connector directly
  const normalizedName =
    NormalizedWalletName[linkedWallet.connector] ?? linkedWallet.connector

  // Capitalize first letter for display
  return normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1)
}

/**
 * Replace generic wallet action text with wallet-specific text
 */
const customizeWalletActionText = (
  action: string,
  walletDisplayName: string
): string => {
  // Replace "Confirm transaction in your wallet" with "Confirm in [WalletName]"
  if (action === 'Confirm transaction in your wallet') {
    return `Confirm in ${walletDisplayName}`
  }

  // Handle "Approve [token] for swap" -> "Approve in [WalletName]"
  if (action.includes('Approve') && action.includes('for swap')) {
    const tokenMatch = action.match(/Approve (.+) for swap/)
    if (tokenMatch) {
      return `Approve in ${walletDisplayName}`
    }
  }

  // Handle "Swap [token] to [token]" -> "Confirm in [WalletName]"
  if (action.includes('Swap') && action.includes(' to ')) {
    return `Confirm in ${walletDisplayName}`
  }

  // Handle other variations
  if (action.includes('Confirm') && action.includes('wallet')) {
    return action.replace(/in your wallet/gi, `in ${walletDisplayName}`)
  }

  return action
}

export type FormattedStep = {
  id: string
  action: string
  isActive: boolean
  isCompleted: boolean
  progressState?: NonNullable<
    Execute['steps']['0']['items']
  >[0]['progressState']
  txHashes?: { txHash: string; chainId: number }[]
  isWalletAction: boolean
  chainId?: number
  isApproveStep?: boolean
  subText?: string
  subTextColor?: 'primary11' | 'green11' | 'subtle' | 'slate10'
  showSubTextSpinner?: boolean
}

type FormatTransactionStepsProps = {
  steps: Execute['steps'] | null
  fromToken?: Token
  toToken?: Token
  fromChain?: RelayChain
  toChain?: RelayChain
  operation: string
  quote?: Execute | null
  currentAddress?: string
  linkedWallets?: LinkedWallet[]
}

/**
 * formattedSteps creates a simplified, user-friendly step progression by:
 * - Creating fixed step sequences (1-4 steps) based on transaction type
 * - Showing clear action text with dynamic sub-text status updates
 * - Preserving transaction hash display and state management
 */
export const formatTransactionSteps = ({
  steps,
  fromToken,
  toToken,
  fromChain,
  toChain,
  operation,
  quote,
  currentAddress,
  linkedWallets
}: FormatTransactionStepsProps) => {
  if (!steps || steps.length === 0) return { formattedSteps: [] }

  // Get wallet display name for customizing action text
  const walletDisplayName = getWalletDisplayName(currentAddress, linkedWallets)

  const result: FormattedStep[] = []
  const executableSteps = steps?.filter(
    (step) => step.items && step.items.length > 0
  )

  // Extract token symbols from quote if not provided in props
  const fromTokenSymbol =
    fromToken?.symbol ||
    quote?.details?.currencyIn?.currency?.symbol ||
    'Unknown'
  const toTokenSymbol =
    toToken?.symbol ||
    quote?.details?.currencyOut?.currency?.symbol ||
    'Unknown'

  // Detect approval steps
  const hasApproval = executableSteps.some(
    (step) => step.id === 'approve' || (step.id as any) === 'approval'
  )

  // Determine transaction type
  const isSameChain = fromChain?.id === toChain?.id

  // Find current active step and its state
  const currentActiveStep = executableSteps.find((step) =>
    step.items?.some((item) => item.status === 'incomplete')
  )
  const currentStepItem = currentActiveStep?.items?.find(
    (item) => item.status === 'incomplete'
  )
  const currentProgressState = currentStepItem?.progressState

  // Check if all steps are complete
  const allStepsComplete = executableSteps.every((step) =>
    step.items?.every((item) => item.status === 'complete')
  )

  // Check if we have transaction hashes for the destination chain
  // We need to be careful about chainId matching - use both toToken and quote details as fallback
  const destinationChainId =
    toToken?.chainId ||
    toChain?.id ||
    quote?.details?.currencyOut?.currency?.chainId

  const hasDestinationTxHashes =
    !isSameChain &&
    !!destinationChainId &&
    executableSteps.some((step) =>
      step.items?.some(
        (item) =>
          item.txHashes?.some((tx) => tx.chainId === destinationChainId) ||
          item.internalTxHashes?.some((tx) => tx.chainId === destinationChainId)
      )
    )

  // Helper to generate sub-text based on step type and state
  const getSubText = (
    stepType: 'approve' | 'send' | 'swap' | 'relay' | 'receive',
    isActive: boolean,
    isCompleted: boolean,
    progressState?: string,
    checkStatus?: string,
    txHashes?: { txHash: string; chainId: number }[],
    internalTxHashes?: { txHash: string; chainId: number }[],
    walletName?: string
  ): string | undefined => {
    // Show success message with txHash for completed steps
    if (isCompleted && (stepType === 'send' || stepType === 'swap')) {
      const hash = internalTxHashes?.[0]?.txHash || txHashes?.[0]?.txHash
      if (hash) {
        return `Success: ${hash.slice(0, 6)}...${hash.slice(-4)}`
      }
    }

    if (!isActive) return undefined

    // Handle submitted status - show appropriate messaging
    if (checkStatus === 'submitted') {
      switch (stepType) {
        case 'send':
          return 'Sent to Relay'
        case 'swap':
          return 'Transaction submitted'
        case 'approve':
          return 'Approval submitted'
        case 'relay':
          return 'Relay processing'
        case 'receive': {
          const destHash = txHashes?.[0]?.txHash
          if (destHash) {
            return `Receiving: ${destHash.slice(0, 6)}...${destHash.slice(-4)}`
          }
          return 'Receiving'
        }
        default:
          return 'Submitted'
      }
    }

    switch (stepType) {
      case 'approve':
        if (progressState === 'confirming')
          return `Approve in ${walletName || 'wallet'}`
        if (progressState === 'validating') return 'Approving'
        return undefined

      case 'send':
      case 'swap':
        if (progressState === 'confirming')
          return `Confirm in ${walletName || 'wallet'}`
        if (progressState === 'validating') {
          // Show txHash when validating (sending to relay)
          // Check both txHashes (available immediately) and internalTxHashes (available after confirmation)
          const hash = txHashes?.[0]?.txHash || internalTxHashes?.[0]?.txHash
          if (stepType === 'send') {
            return hash
              ? `Sending to Relay: ${hash.slice(0, 6)}...${hash.slice(-4)}`
              : 'Sending to Relay'
          } else {
            return 'Relay routing your payment'
          }
        }
        return undefined

      case 'receive': {
        const destHash = txHashes?.[0]?.txHash
        if (destHash) {
          return `Receiving: ${destHash.slice(0, 6)}...${destHash.slice(-4)}`
        }
        return 'Receiving'
      }

      case 'relay':
        return 'Relay routing your payment'

      default:
        return undefined
    }
  }

  // Helper to get sub-text color and spinner visibility
  const getSubTextProps = (
    stepType: 'approve' | 'send' | 'swap' | 'relay' | 'receive',
    isActive: boolean,
    isCompleted: boolean,
    subText?: string,
    checkStatus?: string
  ): {
    color: 'primary11' | 'green11' | 'subtle' | 'slate10' | undefined
    showSpinner: boolean
  } => {
    if (!subText) return { color: undefined, showSpinner: false }

    // Success message styling (completed steps)
    if (isCompleted && subText.startsWith('Success:')) {
      return {
        color: 'green11', // Green for "Success: txhash"
        showSpinner: false
      }
    }

    // Handle submitted status - receiving state
    if (checkStatus === 'submitted') {
      if (stepType === 'receive' && subText.startsWith('Receiving:')) {
        return {
          color: 'primary11', // Primary color for "Receiving: txhash"
          showSpinner: true // Show spinner for receiving
        }
      }
      return {
        color: 'primary11',
        showSpinner: false // No spinner for other submitted states
      }
    }

    if (stepType === 'receive') {
      return {
        color: isActive ? 'primary11' : 'slate10',
        showSpinner: isActive
      }
    }

    // For other step types, use primary11 color and show spinner
    return { color: 'primary11', showSpinner: true }
  }

  // Create fixed step sequence based on transaction type
  if (isSameChain) {
    // Same-chain: 1-2 steps (approval + swap, or just swap)
    if (hasApproval) {
      // Step 1: Approval
      const approvalStep = executableSteps.find(
        (step) => step.id === 'approve' || (step.id as any) === 'approval'
      )
      const isApprovalActive =
        currentActiveStep?.id === approvalStep?.id && !allStepsComplete
      const isApprovalCompleted =
        approvalStep?.items?.every((item) => item.status === 'complete') ||
        false

      const approvalSubText = getSubText(
        'approve',
        isApprovalActive,
        isApprovalCompleted,
        currentProgressState,
        currentStepItem?.checkStatus,
        approvalStep?.items?.flatMap((item) => item.txHashes || []),
        approvalStep?.items?.flatMap((item) => item.internalTxHashes || []),
        walletDisplayName
      )
      const approvalSubTextProps = getSubTextProps(
        'approve',
        isApprovalActive,
        isApprovalCompleted,
        approvalSubText,
        currentStepItem?.checkStatus
      )

      result.push({
        id: 'approve-same-chain',
        action: customizeWalletActionText(
          `Approve ${fromTokenSymbol} for swap`,
          walletDisplayName
        ),
        isActive: isApprovalActive,
        isCompleted: isApprovalCompleted,
        progressState: isApprovalActive ? currentProgressState : undefined,
        txHashes:
          approvalStep?.items?.flatMap((item) => [
            ...(item.txHashes || []),
            ...(item.internalTxHashes || [])
          ]) || [],
        isWalletAction: true,
        chainId: fromToken?.chainId,
        isApproveStep: true,
        subText: approvalSubText,
        subTextColor: approvalSubTextProps.color,
        showSubTextSpinner: approvalSubTextProps.showSpinner
      })

      // Step 2: Swap
      const swapStep = executableSteps.find(
        (step) =>
          step.id === 'swap' || step.id === 'deposit' || step.id === 'send'
      )
      const isSwapActive =
        currentActiveStep?.id === swapStep?.id ||
        (isApprovalCompleted && !allStepsComplete)
      const isSwapCompleted =
        swapStep?.items?.every((item) => item.status === 'complete') || false

      const swapSubText = getSubText(
        'swap',
        isSwapActive,
        isSwapCompleted,
        currentProgressState,
        currentStepItem?.checkStatus,
        swapStep?.items?.flatMap((item) => item.txHashes || []),
        swapStep?.items?.flatMap((item) => item.internalTxHashes || []),
        walletDisplayName
      )
      const swapSubTextProps = getSubTextProps(
        'swap',
        isSwapActive,
        isSwapCompleted,
        swapSubText,
        currentStepItem?.checkStatus
      )

      result.push({
        id: 'swap-same-chain',
        action: `Swap ${fromTokenSymbol} to ${toTokenSymbol}`,
        isActive: isSwapActive,
        isCompleted: isSwapCompleted,
        progressState: isSwapActive ? currentProgressState : undefined,
        txHashes:
          swapStep?.items?.flatMap((item) => [
            ...(item.txHashes || []),
            ...(item.internalTxHashes || [])
          ]) || [],
        isWalletAction: true,
        chainId: fromToken?.chainId,
        isApproveStep: false,
        subText: swapSubText,
        subTextColor: swapSubTextProps.color,
        showSubTextSpinner: swapSubTextProps.showSpinner
      })
    } else {
      // Just swap step
      const swapStep = executableSteps.find(
        (step) =>
          step.id === 'swap' || step.id === 'deposit' || step.id === 'send'
      )
      const isSwapActive = !allStepsComplete
      const isSwapCompleted =
        swapStep?.items?.every((item) => item.status === 'complete') || false

      const swapSubText = getSubText(
        'swap',
        isSwapActive,
        isSwapCompleted,
        currentProgressState,
        currentStepItem?.checkStatus,
        swapStep?.items?.flatMap((item) => item.txHashes || []),
        swapStep?.items?.flatMap((item) => item.internalTxHashes || []),
        walletDisplayName
      )
      const swapSubTextProps = getSubTextProps(
        'swap',
        isSwapActive,
        isSwapCompleted,
        swapSubText,
        currentStepItem?.checkStatus
      )

      result.push({
        id: 'swap-same-chain',
        action: `Swap ${fromTokenSymbol} to ${toTokenSymbol}`,
        isActive: isSwapActive,
        isCompleted: isSwapCompleted,
        progressState: isSwapActive ? currentProgressState : undefined,
        txHashes:
          swapStep?.items?.flatMap((item) => [
            ...(item.txHashes || []),
            ...(item.internalTxHashes || [])
          ]) || [],
        isWalletAction: true,
        chainId: fromToken?.chainId,
        isApproveStep: false,
        subText: swapSubText,
        subTextColor: swapSubTextProps.color,
        showSubTextSpinner: swapSubTextProps.showSpinner
      })
    }
  } else {
    // Cross-chain: 3-4 steps (approval + send + relay + receive, or just send + relay + receive)
    let stepIndex = 0

    if (hasApproval) {
      // Step 1: Approval
      const approvalStep = executableSteps.find(
        (step) => step.id === 'approve' || (step.id as any) === 'approval'
      )
      const isApprovalActive =
        currentActiveStep?.id === approvalStep?.id && !allStepsComplete
      const isApprovalCompleted =
        approvalStep?.items?.every((item) => item.status === 'complete') ||
        false

      const crossChainApprovalSubText = getSubText(
        'approve',
        isApprovalActive,
        isApprovalCompleted,
        currentProgressState,
        currentStepItem?.checkStatus,
        approvalStep?.items?.flatMap((item) => item.txHashes || []),
        approvalStep?.items?.flatMap((item) => item.internalTxHashes || []),
        walletDisplayName
      )
      const crossChainApprovalSubTextProps = getSubTextProps(
        'approve',
        isApprovalActive,
        isApprovalCompleted,
        crossChainApprovalSubText,
        currentStepItem?.checkStatus
      )

      result.push({
        id: 'approve-cross-chain',
        action: `Approve ${fromTokenSymbol} for swap`,
        isActive: isApprovalActive,
        isCompleted: isApprovalCompleted,
        progressState: isApprovalActive ? currentProgressState : undefined,
        txHashes:
          approvalStep?.items?.flatMap((item) => [
            ...(item.txHashes || []),
            ...(item.internalTxHashes || [])
          ]) || [],
        isWalletAction: true,
        chainId: fromToken?.chainId,
        isApproveStep: true,
        subText: crossChainApprovalSubText,
        subTextColor: crossChainApprovalSubTextProps.color,
        showSubTextSpinner: crossChainApprovalSubTextProps.showSpinner
      })
      stepIndex++
    }

    // Step 2/1: Send
    const sendStep = executableSteps.find(
      (step) => step.id === 'deposit' || step.id === 'send'
    )
    const isSendActive =
      currentActiveStep?.id === sendStep?.id ||
      (!hasApproval && !allStepsComplete) ||
      (hasApproval && result[0]?.isCompleted && !allStepsComplete)
    // Consider send step complete if all items are complete OR submitted to relay
    const isSendCompleted =
      sendStep?.items?.every(
        (item) =>
          item.status === 'complete' ||
          item.checkStatus === 'submitted' ||
          item.checkStatus === 'success'
      ) || false

    const sendSubText = getSubText(
      'send',
      isSendActive,
      isSendCompleted,
      currentProgressState,
      currentStepItem?.checkStatus,
      sendStep?.items?.flatMap((item) => item.txHashes || []),
      sendStep?.items?.flatMap((item) => item.internalTxHashes || []),
      walletDisplayName
    )
    const sendSubTextProps = getSubTextProps(
      'send',
      isSendActive,
      isSendCompleted,
      sendSubText,
      currentStepItem?.checkStatus
    )

    result.push({
      id: 'send-cross-chain',
      action: `Send ${fromTokenSymbol} on ${fromChain?.displayName}`,
      isActive: isSendActive,
      isCompleted: isSendCompleted,
      progressState: isSendActive ? currentProgressState : undefined,
      txHashes:
        sendStep?.items?.flatMap((item) => [
          ...(item.txHashes || []),
          ...(item.internalTxHashes || [])
        ]) || [],
      isWalletAction: true,
      chainId: fromToken?.chainId,
      isApproveStep: false,
      subText: sendSubText,
      subTextColor: sendSubTextProps.color,
      showSubTextSpinner: sendSubTextProps.showSpinner
    })

    // Check if we're in receiving state (have destination hashes from submitted status)
    const isInReceivingState =
      currentStepItem?.checkStatus === 'submitted' &&
      currentStepItem?.status === 'incomplete' &&
      currentStepItem?.txHashes &&
      currentStepItem?.txHashes.length > 0 &&
      // Check that we have destination chain hashes, not origin hashes
      currentStepItem.txHashes.some((tx) => tx.chainId === destinationChainId)

    // Step 3/2: Relay processing
    // Active when send is complete but no destination hashes yet
    // This ensures it doesn't activate simultaneously with receive step
    const relayStepActive =
      isSendCompleted && !hasDestinationTxHashes && !isInReceivingState
    const relayStepCompleted = hasDestinationTxHashes || isInReceivingState

    result.push({
      id: 'relay-processing',
      action: 'Relay routes your payment',
      isActive: Boolean(relayStepActive),
      isCompleted: Boolean(relayStepCompleted),
      isWalletAction: false,
      chainId: fromChain?.id,
      isApproveStep: false,
      subText: undefined
    })

    // Step 4/3: Receive
    // The receive step becomes active when:
    // 1. We have destination txHashes OR
    // 2. Current step has 'submitted' status with DESTINATION txHashes (receiving state)
    // It completes when all backend steps are done (allStepsComplete)

    const receiveStepActive = Boolean(
      (hasDestinationTxHashes || isInReceivingState) && !allStepsComplete
    )
    const receiveStepCompleted = Boolean(allStepsComplete)

    result.push({
      id: 'receive-cross-chain',
      action: `Receive ${toTokenSymbol} on ${toChain?.displayName}`,
      isActive: receiveStepActive,
      isCompleted: receiveStepCompleted,
      isWalletAction: false,
      chainId: toChain?.id,
      isApproveStep: false
    })
  }

  return { formattedSteps: result }
}

/**
 * Returns the appropriate action text for a transaction step based on its ID
 * @param stepId The ID of the step
 * @param operation The operation being performed (swap, bridge, etc.)
 * @returns The formatted action text to display
 */
export function getStepActionText(stepId: string, operation: string): string {
  if (stepId === 'approve' || stepId === 'approval') {
    return 'Approve token'
  }
  if (
    stepId === 'authorize' ||
    stepId === 'authorize1' ||
    stepId === 'authorize2'
  ) {
    return 'Sign authorization'
  }

  if (stepId === 'swap' || stepId === 'deposit' || stepId === 'send') {
    return `Confirm ${operation}`
  }

  return 'Confirm transaction'
}
