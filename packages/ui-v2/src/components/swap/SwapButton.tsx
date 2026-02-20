import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import { Button } from '@/components/ui/button.js'
import { EventNames } from '@/constants/events.js'

interface SwapButtonProps {
  /** The CTA text (from useSwapButtonCta) */
  ctaCopy: string
  onClick: () => void
  /** True while swap execution is in progress */
  isExecuting?: boolean
  /** True while a quote is being fetched */
  isFetchingQuote?: boolean
  /** True when the button should be disabled (missing token, insufficient balance, etc.) */
  isDisabled?: boolean
  /** True when no wallet is connected */
  isNotConnected?: boolean
  onConnectWallet?: () => void
  onAnalyticEvent?: (eventName: string, data?: Record<string, unknown>) => void
  className?: string
}

/**
 * The main CTA button for the swap widget.
 * Shows a spinner while executing or fetching a quote.
 * When not connected, shows "Connect Wallet" instead.
 */
export const SwapButton: React.FC<SwapButtonProps> = ({
  ctaCopy,
  onClick,
  isExecuting = false,
  isFetchingQuote = false,
  isDisabled = false,
  isNotConnected = false,
  onConnectWallet,
  onAnalyticEvent,
  className
}) => {
  const handleClick = () => {
    if (isNotConnected) {
      // Analytics: user clicked connect wallet
      onAnalyticEvent?.(EventNames.CONNECT_WALLET_CLICKED)
      onConnectWallet?.()
      return
    }
    onClick()
  }

  const showSpinner = isExecuting

  // Determine disabled state — show button as clickable even during quote fetch
  // so the user can still see the button, but disable during actual execution
  const buttonDisabled = isExecuting || (isDisabled && !isNotConnected)

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={buttonDisabled}
      isLoading={showSpinner}
      className={cn(
        'w-full h-12 text-base font-semibold',
        // Subtle scale on hover/active
        'transition-all duration-150',
        'hover:scale-[1.01] active:scale-[0.99]',
        className
      )}
    >
      {showSpinner && (
        // motion: spinning loader icon
        <Loader2
          className="h-4 w-4 motion-safe:animate-spin"
          aria-hidden="true"
        />
      )}
      <span>{isNotConnected ? 'Connect Wallet' : ctaCopy}</span>
    </Button>
  )
}
