import type { Execute, RelayChain } from '@relayprotocol/relay-sdk'
import type { Token } from '../types/index.js'

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
  subTextColor?: 'primary11' | 'subtle'
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
  quote
}: FormatTransactionStepsProps) => {
  if (!steps || steps.length === 0)
    return { formattedSteps: [], status: undefined }

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

  // Check if the last executable step has validating_delayed status
  const lastStep = executableSteps[executableSteps.length - 1]
  const lastStepItem = lastStep?.items?.[0]
  const status =
    lastStepItem?.progressState === 'validating_delayed' ? 'delayed' : undefined

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

  // Helper to generate sub-text based on step type and state
  const getSubText = (
    stepType: 'approve' | 'send' | 'swap' | 'relay' | 'receive',
    isActive: boolean,
    isCompleted: boolean,
    progressState?: string
  ): string | undefined => {
    if (isCompleted) return undefined

    switch (stepType) {
      case 'approve':
        if (progressState === 'confirming') return 'Approve in Metamask'
        if (progressState === 'validating') return 'Approving'
        return 'Approve in Metamask'

      case 'send':
      case 'swap':
        if (progressState === 'confirming') return 'Confirm in Metamask'
        if (progressState === 'validating') {
          return stepType === 'send'
            ? 'Sending to Relay'
            : 'Relay routing your payment'
        }
        return 'Confirm in Metamask'

      case 'receive':
        if (isActive && toToken?.address) {
          return `Receiving: ${toToken.address.slice(0, 6)}...${toToken.address.slice(-4)}`
        }
        return 'Queued'

      default:
        return undefined
    }
  }

  // Helper to get sub-text color and spinner visibility
  const getSubTextProps = (
    stepType: 'approve' | 'send' | 'swap' | 'relay' | 'receive',
    isActive: boolean,
    isCompleted: boolean,
    subText?: string
  ): { color: 'primary11' | 'subtle' | undefined; showSpinner: boolean } => {
    if (!subText) return { color: undefined, showSpinner: false }

    if (stepType === 'receive') {
      return {
        color: isActive ? 'primary11' : 'subtle',
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
        currentProgressState
      )
      const approvalSubTextProps = getSubTextProps(
        'approve',
        isApprovalActive,
        isApprovalCompleted,
        approvalSubText
      )

      result.push({
        id: 'approve-same-chain',
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
        currentProgressState
      )
      const swapSubTextProps = getSubTextProps(
        'swap',
        isSwapActive,
        isSwapCompleted,
        swapSubText
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
        currentProgressState
      )
      const swapSubTextProps = getSubTextProps(
        'swap',
        isSwapActive,
        isSwapCompleted,
        swapSubText
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
        currentProgressState
      )
      const crossChainApprovalSubTextProps = getSubTextProps(
        'approve',
        isApprovalActive,
        isApprovalCompleted,
        crossChainApprovalSubText
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
    const isSendCompleted =
      sendStep?.items?.every((item) => item.status === 'complete') || false

    const sendSubText = getSubText(
      'send',
      isSendActive,
      isSendCompleted,
      currentProgressState
    )
    const sendSubTextProps = getSubTextProps(
      'send',
      isSendActive,
      isSendCompleted,
      sendSubText
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

    // Step 3/2: Relay processing
    result.push({
      id: 'relay-processing',
      action: 'Relay routes your payment',
      isActive: isSendCompleted && !allStepsComplete,
      isCompleted: false,
      isWalletAction: false,
      chainId: fromChain?.id,
      isApproveStep: false,
      subText: undefined
    })

    // Step 4/3: Receive
    const receiveSubText = getSubText(
      'receive',
      allStepsComplete,
      false,
      currentProgressState
    )
    const receiveSubTextProps = getSubTextProps(
      'receive',
      allStepsComplete,
      false,
      receiveSubText
    )

    result.push({
      id: 'receive-cross-chain',
      action: `Receive ${toTokenSymbol} on ${toChain?.displayName}`,
      isActive: allStepsComplete,
      isCompleted: false,
      isWalletAction: false,
      chainId: toChain?.id,
      isApproveStep: false,
      subText: receiveSubText,
      subTextColor: receiveSubTextProps.color,
      showSubTextSpinner: receiveSubTextProps.showSpinner
    })
  }

  return { formattedSteps: result, status }
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
