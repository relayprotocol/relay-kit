import type { Execute, RelayChain } from '@relayprotocol/relay-sdk'
import type { Token, LinkedWallet } from '../types/index.js'
import { NormalizedWalletName } from '../constants/walletCompatibility.js'

/**
 * Get display name for wallet from linkedWallets array using current address
 * Returns undefined if no wallet name can be determined
 */
const getWalletDisplayName = (
  currentAddress?: string,
  linkedWallets?: LinkedWallet[]
): string | undefined => {
  if (!currentAddress || !linkedWallets) {
    return undefined
  }

  const linkedWallet = linkedWallets.find(
    (linkedWallet) =>
      currentAddress ===
        (linkedWallet.vmType === 'evm'
          ? linkedWallet.address.toLowerCase()
          : linkedWallet.address) || linkedWallet.address === currentAddress
  )

  if (!linkedWallet?.connector) {
    return undefined
  }

  const normalizedName =
    NormalizedWalletName[linkedWallet.connector] ?? linkedWallet.connector

  // Capitalize first letter for display
  return normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1)
}

/**
 * Generate wallet-specific action text based on step ID
 * More reliable than string matching - uses stable step identifiers
 */
const getWalletActionText = (
  stepId: string,
  walletDisplayName: string
): string => {
  if (stepId.includes('approve')) {
    return `Approve in ${walletDisplayName}`
  }

  if (stepId.includes('authorize')) {
    return `Sign in ${walletDisplayName}`
  }

  // All other wallet actions (swap, send, deposit) require confirmation
  return `Confirm in ${walletDisplayName}`
}

/**
 * Generate display action text for non-wallet steps
 */
const getDisplayActionText = (
  stepId: string,
  context?: {
    fromTokenSymbol?: string
    toTokenSymbol?: string
    fromChainName?: string
    toChainName?: string
    operation?: string
  }
): string => {
  if (stepId.includes('approve')) {
    const tokenSymbol = context?.fromTokenSymbol || 'token'
    const operationText =
      context?.operation === 'wrap'
        ? 'wrap'
        : context?.operation === 'unwrap'
          ? 'unwrap'
          : context?.operation === 'send'
            ? 'send'
            : 'swap'
    return `Approve ${tokenSymbol} for ${operationText}`
  }

  // Use operation type to determine the correct action text
  if (
    stepId.includes('swap') ||
    stepId.includes('send') ||
    stepId.includes('deposit')
  ) {
    const fromSymbol = context?.fromTokenSymbol || 'token'
    const toSymbol = context?.toTokenSymbol || 'token'
    const chainName = context?.fromChainName || 'chain'

    if (context?.operation === 'send') {
      return `Send ${fromSymbol}`
    } else if (context?.operation === 'wrap') {
      return `Wrap ${fromSymbol}`
    } else if (context?.operation === 'unwrap') {
      return `Unwrap ${fromSymbol}`
    } else {
      return stepId.includes('send')
        ? `Send ${fromSymbol} on ${chainName}`
        : `Swap ${fromSymbol} to ${toSymbol}`
    }
  }

  if (stepId.includes('relay')) {
    return 'Relay routes your payment'
  }

  if (stepId.includes('receive')) {
    const tokenSymbol = context?.toTokenSymbol || 'token'
    const chainName = context?.toChainName || 'chain'
    return `Receive ${tokenSymbol} on ${chainName}`
  }

  return 'Processing transaction'
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
  const walletDisplayName =
    getWalletDisplayName(currentAddress, linkedWallets) ?? 'your wallet'

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

    // Handle pending status - backend processing (relay step)
    if (checkStatus === 'pending') {
      if (stepType === 'relay') {
        return 'Relay routing your payment'
      }
      if (stepType === 'send') {
        return 'Sent to Relay'
      }
    }

    // Handle submitted status - destination tx submitted (receive step)
    if (checkStatus === 'submitted') {
      switch (stepType) {
        case 'receive': {
          const destHash = txHashes?.[0]?.txHash
          if (destHash) {
            return `Receiving: ${destHash.slice(0, 6)}...${destHash.slice(-4)}`
          }
          return 'Receiving'
        }
        case 'relay':
          return 'Relay processing complete'
        default:
          return 'Transaction submitted'
      }
    }

    switch (stepType) {
      case 'approve':
        if (progressState === 'validating') return 'Approving'
        return `Approve in ${walletName || 'wallet'}`

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

    if (isCompleted && subText.startsWith('Success:')) {
      return {
        color: 'green11',
        showSpinner: false
      }
    }

    // Handle pending status (relay step active)
    if (checkStatus === 'pending') {
      if (stepType === 'relay') {
        return {
          color: 'primary11',
          showSpinner: true
        }
      }
      return {
        color: 'primary11',
        showSpinner: false
      }
    }

    // Handle submitted status (receive step active)
    if (checkStatus === 'submitted') {
      if (stepType === 'receive' && subText.startsWith('Receiving')) {
        return {
          color: 'primary11',
          showSpinner: true
        }
      }
      return {
        color: 'primary11',
        showSpinner: false
      }
    }

    if (stepType === 'receive') {
      return {
        color: isActive ? 'primary11' : 'slate10',
        showSpinner: isActive
      }
    }

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
        action: getDisplayActionText('approve-same-chain', {
          fromTokenSymbol,
          toTokenSymbol,
          fromChainName: fromChain?.displayName,
          toChainName: toChain?.displayName,
          operation
        }),
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
        action: getDisplayActionText('swap-same-chain', {
          fromTokenSymbol,
          toTokenSymbol,
          fromChainName: fromChain?.displayName,
          toChainName: toChain?.displayName,
          operation
        }),
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
        action: getDisplayActionText('swap-same-chain', {
          fromTokenSymbol,
          toTokenSymbol,
          fromChainName: fromChain?.displayName,
          toChainName: toChain?.displayName,
          operation
        }),
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
        action: getDisplayActionText('approve-cross-chain', {
          fromTokenSymbol,
          toTokenSymbol,
          fromChainName: fromChain?.displayName,
          toChainName: toChain?.displayName,
          operation
        }),
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
    // Send step completes when origin tx is confirmed (pending status = backend is now processing)
    const isSendCompleted =
      sendStep?.items?.every(
        (item) =>
          item.status === 'complete' ||
          item.checkStatus === 'pending' ||
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
      action: getDisplayActionText('send-cross-chain', {
        fromTokenSymbol,
        toTokenSymbol,
        fromChainName: fromChain?.displayName,
        toChainName: toChain?.displayName,
        operation
      }),
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

    // Check if we're in receiving state (destination tx submitted)
    // The 'submitted' status means destination tx was submitted, even if txHashes aren't ready yet
    const isInReceivingState =
      currentStepItem?.checkStatus === 'submitted' &&
      currentStepItem?.status === 'incomplete'

    // Step 3/2: Relay processing
    // Active during 'pending' status (backend processing after origin tx confirmed)
    const relayStepActive =
      isSendCompleted &&
      currentStepItem?.checkStatus === 'pending' &&
      !isInReceivingState
    const relayStepCompleted =
      currentStepItem?.checkStatus === 'submitted' ||
      currentStepItem?.checkStatus === 'success' ||
      hasDestinationTxHashes ||
      isInReceivingState

    const relaySubText = getSubText(
      'relay',
      Boolean(relayStepActive),
      Boolean(relayStepCompleted),
      undefined,
      currentStepItem?.checkStatus,
      undefined,
      undefined,
      walletDisplayName
    )
    const relaySubTextProps = getSubTextProps(
      'relay',
      Boolean(relayStepActive),
      Boolean(relayStepCompleted),
      relaySubText,
      currentStepItem?.checkStatus
    )

    result.push({
      id: 'relay-processing',
      action: getDisplayActionText('relay-processing'),
      isActive: Boolean(relayStepActive),
      isCompleted: Boolean(relayStepCompleted),
      isWalletAction: false,
      chainId: fromChain?.id,
      isApproveStep: false,
      subText: relaySubText,
      subTextColor: relaySubTextProps.color,
      showSubTextSpinner: relaySubTextProps.showSpinner
    })

    // Step 4/3: Receive
    // The receive step becomes active when status reaches 'submitted'
    const receiveStepActive = Boolean(
      (hasDestinationTxHashes || isInReceivingState) && !allStepsComplete
    )
    const receiveStepCompleted = Boolean(allStepsComplete)

    const receiveSubText = getSubText(
      'receive',
      receiveStepActive,
      receiveStepCompleted,
      undefined,
      currentStepItem?.checkStatus,
      currentStepItem?.txHashes,
      undefined,
      walletDisplayName
    )
    const receiveSubTextProps = getSubTextProps(
      'receive',
      receiveStepActive,
      receiveStepCompleted,
      receiveSubText,
      currentStepItem?.checkStatus
    )

    result.push({
      id: 'receive-cross-chain',
      action: getDisplayActionText('receive-cross-chain', {
        toTokenSymbol,
        toChainName: toChain?.displayName
      }),
      isActive: receiveStepActive,
      isCompleted: receiveStepCompleted,
      isWalletAction: false,
      chainId: toChain?.id,
      isApproveStep: false,
      subText: receiveSubText,
      subTextColor: receiveSubTextProps.color,
      showSubTextSpinner: receiveSubTextProps.showSpinner
    })
  }

  return { formattedSteps: result }
}
