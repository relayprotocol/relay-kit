import * as React from 'react'
import { CheckCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button.js'
import type { Execute } from '@relayprotocol/relay-sdk'

interface SuccessStepProps {
  steps?: Execute['steps'] | null
  onSwapAgain: () => void
  onClose: () => void
}

/**
 * Swap success step.
 * Shows an animated checkmark and links to the transaction explorer.
 */
export const SuccessStep: React.FC<SuccessStepProps> = ({
  steps,
  onSwapAgain,
  onClose
}) => {
  // Collect tx hashes from all steps
  const txHashes = React.useMemo(() => {
    if (!steps) return []
    return steps.flatMap((step) =>
      step.items?.flatMap((item) => item.txHashes ?? []) ?? []
    )
  }, [steps])

  return (
    // motion: fade in when step becomes active
    <div className="motion-safe:animate-fade-in flex flex-col items-center gap-4 p-8 text-center">
      {/* motion: scale-in bounce for the checkmark */}
      <div className="motion-safe:animate-[scale-in_300ms_ease-out]">
        <CheckCircle
          className="h-16 w-16 text-green-500"
          aria-hidden="true"
        />
      </div>

      <div>
        <p className="text-xl font-bold">Swap Successful!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your tokens have been bridged successfully.
        </p>
      </div>

      {/* Explorer links */}
      {txHashes.length > 0 && (
        <div className="flex flex-col gap-1 w-full">
          {txHashes.slice(0, 2).map((hash, i) => (
            <a
              key={i}
              href={`https://etherscan.io/tx/${hash.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
            >
              <span>View transaction {i + 1}</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 w-full">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Close
        </Button>
        <Button onClick={onSwapAgain} className="flex-1">
          Swap Again
        </Button>
      </div>
    </div>
  )
}
