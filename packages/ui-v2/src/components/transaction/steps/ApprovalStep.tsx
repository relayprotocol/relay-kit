import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils.js'

interface ApprovalStepProps {
  tokenSymbol?: string
}

/**
 * ERC20 approval pending step.
 * Shown while waiting for the user to approve the token spend in their wallet.
 */
export const ApprovalStep: React.FC<ApprovalStepProps> = ({ tokenSymbol }) => {
  return (
    // motion: fade in when step becomes active
    <div className="motion-safe:animate-fade-in flex flex-col items-center gap-4 p-8 text-center">
      {/* motion: spinning loader */}
      <Loader2
        className="h-12 w-12 text-primary motion-safe:animate-spin"
        aria-hidden="true"
      />
      <div>
        <p className="text-base font-semibold">Approving {tokenSymbol ?? 'token'}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm the approval in your wallet to continue.
        </p>
      </div>
    </div>
  )
}
