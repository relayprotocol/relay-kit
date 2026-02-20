import * as React from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import { Button } from '@/components/ui/button.js'
import type { Token } from '@/types/token.js'
import type { FeeBreakdown } from '@/types/fee.js'
import { formatBN } from '@/lib/format.js'
import type { Execute } from '@relayprotocol/relay-sdk'

interface ConfirmationStepProps {
  fromToken?: Token
  toToken?: Token
  amountInputValue?: string
  amountOutputValue?: string
  feeBreakdown?: FeeBreakdown | null
  timeEstimate?: { time: number; formattedTime: string }
  onConfirm: () => void
  onCancel: () => void
  isExecuting?: boolean
  quote?: ReturnType<() => { details?: Execute['details'] }>
}

/**
 * Transaction confirmation step.
 * Shows the swap summary and asks the user to confirm.
 * The confirm button is auto-focused for keyboard users.
 */
export const ConfirmationStep: React.FC<ConfirmationStepProps> = ({
  fromToken,
  toToken,
  amountInputValue,
  amountOutputValue,
  feeBreakdown,
  timeEstimate,
  onConfirm,
  onCancel,
  isExecuting = false
}) => {
  const confirmRef = React.useRef<HTMLButtonElement>(null)

  // a11y: auto-focus the confirm button when this step mounts
  React.useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  return (
    // motion: fade in when step becomes active
    <div className="motion-safe:animate-fade-in flex flex-col gap-4 p-6">
      {/* Swap summary */}
      <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
        {/* From */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            {fromToken?.logoURI && (
              <img
                src={fromToken.logoURI}
                alt=""
                aria-hidden="true"
                className="h-8 w-8 rounded-full bg-muted"
              />
            )}
            <div>
              <p className="text-lg font-bold">{amountInputValue}</p>
              <p className="text-xs text-muted-foreground">{fromToken?.symbol}</p>
            </div>
          </div>
        </div>

        <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />

        {/* To */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            {toToken?.logoURI && (
              <img
                src={toToken.logoURI}
                alt=""
                aria-hidden="true"
                className="h-8 w-8 rounded-full bg-muted"
              />
            )}
            <div>
              <p className="text-lg font-bold">{amountOutputValue}</p>
              <p className="text-xs text-muted-foreground">{toToken?.symbol}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fee details */}
      {feeBreakdown && (
        <div className="rounded-xl border border-border p-3 flex flex-col gap-2">
          {feeBreakdown.breakdown.map((fee) => (
            <div key={fee.id} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{fee.name}</span>
              <span>{fee.usd.formatted}</span>
            </div>
          ))}
          {timeEstimate && (
            <div className="flex items-center justify-between text-xs border-t border-border/50 pt-2 mt-1">
              <span className="text-muted-foreground">Estimated time</span>
              <span>{timeEstimate.formattedTime}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isExecuting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          ref={confirmRef}
          onClick={onConfirm}
          isLoading={isExecuting}
          className="flex-1"
        >
          {isExecuting ? 'Confirming...' : 'Confirm Swap'}
        </Button>
      </div>
    </div>
  )
}
