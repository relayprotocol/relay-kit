import * as React from 'react'
import { ArrowDownUp } from 'lucide-react'
import { cn } from '@/lib/utils.js'

interface SwapArrowProps {
  onClick: () => void
  className?: string
}

/**
 * The directional arrow button between the from/to token panels.
 * Clicking it swaps the from and to tokens and rotates 180° for visual feedback.
 *
 * a11y: has aria-label describing the action; responds to Enter and Space.
 * motion: rotates 180deg with a smooth CSS transition.
 */
export const SwapArrow: React.FC<SwapArrowProps> = ({ onClick, className }) => {
  const [rotated, setRotated] = React.useState(false)

  const handleClick = () => {
    // motion: rotate the icon to signal direction change
    setRotated((prev) => !prev)
    onClick()
  }

  return (
    <div className={cn('flex justify-center', className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Switch from and to tokens"
        className={cn(
          'flex items-center justify-center',
          'h-9 w-9 rounded-lg',
          'border border-border bg-background',
          'text-muted-foreground hover:text-foreground',
          'transition-colors duration-150',
          'hover:bg-accent',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Minimum touch target
          'min-h-[44px] min-w-[44px]'
        )}
      >
        <ArrowDownUp
          className={cn(
            'h-4 w-4',
            // motion: rotate 180deg when toggled
            'transition-transform duration-200',
            'motion-safe:ease-in-out',
            rotated && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
