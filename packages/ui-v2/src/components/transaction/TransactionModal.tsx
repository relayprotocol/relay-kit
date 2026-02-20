import * as React from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton
} from '@/components/ui/dialog.js'
import { ConfirmationStep } from './steps/ConfirmationStep.js'
import { SuccessStep } from './steps/SuccessStep.js'
import { ErrorStep } from './steps/ErrorStep.js'
import { EventNames } from '@/constants/events.js'
import { cn } from '@/lib/utils.js'
import type { Token } from '@/types/token.js'
import type { FeeBreakdown } from '@/types/fee.js'
import type { Execute } from '@relayprotocol/relay-sdk'

type TransactionStep =
  | 'confirmation'
  | 'executing'
  | 'success'
  | 'error'

interface TransactionModalProps {
  open: boolean
  onClose: () => void
  fromToken?: Token
  toToken?: Token
  amountInputValue?: string
  amountOutputValue?: string
  feeBreakdown?: FeeBreakdown | null
  timeEstimate?: { time: number; formattedTime: string }
  steps?: Execute['steps'] | null
  swapError?: Error | null
  /** Called when user confirms (executes the swap) */
  onConfirm: () => void
  /** Called when swap completes successfully */
  onSuccess?: () => void
  onAnalyticEvent?: (eventName: string, data?: Record<string, unknown>) => void
}

/**
 * Derives a human-readable label for each SDK step ID.
 */
function stepLabel(stepId: string): string {
  switch (stepId) {
    case 'approve': return 'Approve token'
    case 'deposit':
    case 'initiate': return 'Submit transaction'
    case 'bridge':
    case 'relay': return 'Bridge assets'
    case 'wait': return 'Processing'
    default: return stepId.charAt(0).toUpperCase() + stepId.slice(1)
  }
}

/**
 * Live step list displayed while a swap is executing.
 * Each step shows: waiting dot / spinner (active) / green check (complete).
 */
const ExecutingStepsView: React.FC<{ steps: Execute['steps'] }> = ({ steps }) => {
  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <div className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const allComplete = step.items?.every((item) => item.status === 'complete') ?? false
          // A step is "active" if it's the first step that has incomplete items
          const isActive =
            !allComplete &&
            step.items?.some((item) => item.status === 'incomplete') === true &&
            steps.slice(0, i).every((s) => s.items?.every((item) => item.status === 'complete'))

          return (
            <div key={step.id} className="flex items-start gap-3">
              {/* Status icon */}
              <div className="mt-0.5 shrink-0">
                {allComplete ? (
                  <CheckCircle2
                    className="h-5 w-5 text-green-500"
                    aria-label="Complete"
                  />
                ) : isActive ? (
                  <Loader2
                    className="h-5 w-5 text-primary animate-spin"
                    aria-label="In progress"
                  />
                ) : (
                  <Circle
                    className="h-5 w-5 text-muted-foreground/30"
                    aria-label="Waiting"
                  />
                )}
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    allComplete ? 'text-muted-foreground line-through' : isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {stepLabel(step.id)}
                </p>
                {step.description && !allComplete && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {step.description}
                  </p>
                )}
                {/* Show tx hash links when available */}
                {allComplete && step.items?.flatMap((item) => item.txHashes ?? []).slice(0, 1).map((tx) => (
                  <a
                    key={tx.txHash}
                    href={`https://explorer.relay.link/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-primary hover:underline truncate block"
                  >
                    {tx.txHash.slice(0, 10)}…{tx.txHash.slice(-6)}
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground mt-2">
        Do not close this window until the swap completes.
      </p>
    </div>
  )
}

/**
 * Multi-step transaction modal for the swap flow.
 * Steps: confirmation → executing (with live step list) → success/error
 *
 * Uses key-based rendering so each step fades in cleanly when the state changes.
 * Focus is trapped inside the modal by Radix Dialog.
 */
export const TransactionModal: React.FC<TransactionModalProps> = ({
  open,
  onClose,
  fromToken,
  toToken,
  amountInputValue,
  amountOutputValue,
  feeBreakdown,
  timeEstimate,
  steps,
  swapError,
  onConfirm,
  onSuccess,
  onAnalyticEvent
}) => {
  // Derive the current step from execution state
  const currentStep = React.useMemo<TransactionStep>(() => {
    if (swapError) return 'error'
    if (!steps) return 'confirmation'
    const allComplete = steps.every((s) =>
      s.items?.every((item) => item.status === 'complete')
    )
    if (allComplete) return 'success'
    return 'executing'
  }, [steps, swapError])

  // Analytics: fire modal open events
  React.useEffect(() => {
    if (open) {
      onAnalyticEvent?.(EventNames.SWAP_MODAL_OPEN)
    }
  }, [open, onAnalyticEvent])

  const handleClose = () => {
    onAnalyticEvent?.(EventNames.SWAP_MODAL_CLOSED, {
      swap_in_progress: currentStep === 'executing'
    })
    onClose()
  }

  const handleSwapAgain = () => {
    onSuccess?.()
    handleClose()
  }

  const handleRetry = () => {
    handleClose()
  }

  const titleMap: Record<TransactionStep, string> = {
    confirmation: 'Review Swap',
    executing: 'Swap in Progress',
    success: 'Swap Complete',
    error: 'Swap Failed'
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-[400px] w-full p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0 relative">
          <DialogTitle>{titleMap[currentStep]}</DialogTitle>
          {/* Hide close button while executing to prevent accidental close */}
          {currentStep !== 'executing' && (
            <DialogCloseButton />
          )}
        </DialogHeader>

        {/* Step content — key-based so each transition fades */}
        {currentStep === 'confirmation' && (
          <ConfirmationStep
            key="confirmation"
            fromToken={fromToken}
            toToken={toToken}
            amountInputValue={amountInputValue}
            amountOutputValue={amountOutputValue}
            feeBreakdown={feeBreakdown}
            timeEstimate={timeEstimate}
            onConfirm={onConfirm}
            onCancel={handleClose}
          />
        )}

        {currentStep === 'executing' && steps && (
          <ExecutingStepsView key="executing" steps={steps} />
        )}

        {currentStep === 'success' && (
          <SuccessStep
            key="success"
            steps={steps}
            onSwapAgain={handleSwapAgain}
            onClose={handleClose}
          />
        )}

        {currentStep === 'error' && (
          <ErrorStep
            key="error"
            error={swapError}
            onRetry={handleRetry}
            onDismiss={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
