import * as React from 'react'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button.js'

interface ErrorStepProps {
  error?: Error | string | null
  onRetry: () => void
  onDismiss: () => void
}

/**
 * Swap error step.
 * Shows the error message and offers retry + dismiss buttons.
 * a11y: announces error via aria-live="assertive" when mounted.
 */
export const ErrorStep: React.FC<ErrorStepProps> = ({
  error,
  onRetry,
  onDismiss
}) => {
  const errorMessage =
    typeof error === 'string'
      ? error
      : error?.message ?? 'An unexpected error occurred. Please try again.'

  return (
    // motion: fade in when step becomes active
    <div className="motion-safe:animate-fade-in flex flex-col items-center gap-4 p-8 text-center">
      {/* a11y: assertive announcement so screen readers immediately announce the error */}
      <div role="alert" aria-live="assertive" className="sr-only">
        Swap failed: {errorMessage}
      </div>

      <XCircle className="h-16 w-16 text-destructive" aria-hidden="true" />

      <div>
        <p className="text-xl font-bold">Swap Failed</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs break-words">
          {errorMessage}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 w-full">
        <Button variant="outline" onClick={onDismiss} className="flex-1">
          Dismiss
        </Button>
        <Button onClick={onRetry} className="flex-1">
          Try Again
        </Button>
      </div>
    </div>
  )
}
