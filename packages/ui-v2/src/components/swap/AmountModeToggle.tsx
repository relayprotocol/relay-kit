import * as React from 'react'
import { ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import { Skeleton } from '@/components/ui/skeleton.js'

interface AmountModeToggleProps {
  /** The "other" value to display (USD when in token mode, tokens when in USD mode) */
  displayValue: string
  isLoading: boolean
  onToggle: () => void
  className?: string
}

/**
 * Compact toggle row shown below the amount input.
 * Displays the equivalent amount in the "other" unit and a ⇅ button to switch modes.
 */
export const AmountModeToggle: React.FC<AmountModeToggleProps> = ({
  displayValue,
  isLoading,
  onToggle,
  className
}) => {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {isLoading ? (
        <Skeleton className="h-3.5 w-20" />
      ) : (
        <span className="text-xs text-muted-foreground">{displayValue}</span>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle USD / token amount mode"
        className={cn(
          'p-0.5 rounded transition-colors duration-100',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  )
}
