import * as React from 'react'
import { cn } from '@/lib/utils.js'
import { Skeleton } from '@/components/ui/skeleton.js'
import { formatBN } from '@/lib/format.js'
import { EventNames } from '@/constants/events.js'
import type { Token } from '@/types/token.js'

const PERCENT_OPTIONS = [20, 50] as const

interface BalanceDisplayProps {
  token?: Token
  balance?: bigint
  isLoading?: boolean
  hasPendingBalance?: boolean
  /** When true, shows the MAX button */
  showMaxButton?: boolean
  /** When true, shows 20% and 50% buttons alongside MAX */
  showPercentButtons?: boolean
  onMaxClick?: () => void
  /** Called with the percent (20 or 50) when a percent button is clicked */
  onPercentClick?: (percent: number) => void
  /** When true, shows the balance in red (user entered more than their balance) */
  isOverBalance?: boolean
  /** ID for aria-describedby association from the amount input */
  id?: string
  onAnalyticEvent?: (eventName: string, data?: Record<string, unknown>) => void
  className?: string
}

/**
 * Displays the user's token balance (right-aligned) and optionally
 * percentage (20%, 50%) and MAX buttons below it.
 * Used in the from-token panel.
 */
export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  token,
  balance,
  isLoading = false,
  hasPendingBalance = false,
  showMaxButton = false,
  showPercentButtons = false,
  onMaxClick,
  onPercentClick,
  isOverBalance = false,
  id,
  onAnalyticEvent,
  className
}) => {
  const formattedBalance = React.useMemo(() => {
    if (balance === undefined || !token) return '0'
    return formatBN(balance, 5, token.decimals)
  }, [balance, token])

  const handleMaxClick = () => {
    if (!onMaxClick) return
    onAnalyticEvent?.(EventNames.MAX_AMOUNT_CLICKED, {
      symbol: token?.symbol,
      chainId: token?.chainId,
      balance: formattedBalance
    })
    onMaxClick()
  }

  const handlePercentClick = (percent: number) => {
    onPercentClick?.(percent)
  }

  if (!token) return null

  const hasButtons = (showMaxButton && onMaxClick) || (showPercentButtons && onPercentClick)

  return (
    <div
      id={id}
      className={cn('flex flex-col gap-1.5', className)}
    >
      {/* Balance — right-aligned, red when over balance */}
      <div className="flex justify-end">
        <div className={cn(
          'flex items-center gap-1 text-xs transition-colors duration-150',
          isOverBalance ? 'text-destructive' : 'text-muted-foreground'
        )}>
          <span>Balance:</span>
          {isLoading ? (
            <Skeleton className="h-3 w-12" aria-hidden="true" />
          ) : (
            <span>
              {formattedBalance} {token.symbol}
              {hasPendingBalance && (
                <span className="ml-1 text-amber-500" title="Pending balance">
                  (pending)
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons — full width row */}
      {hasButtons && (
        <div className="flex gap-1.5">
          {showPercentButtons && onPercentClick &&
            PERCENT_OPTIONS.map((percent) => (
              <button
                key={percent}
                type="button"
                onClick={() => handlePercentClick(percent)}
                disabled={isLoading || balance === undefined}
                aria-label={`Set ${percent}% of ${token.symbol} balance`}
                className={cn(
                  'flex-1 rounded-lg border border-border px-2 py-1.5',
                  'text-xs font-medium text-muted-foreground',
                  'hover:bg-accent hover:border-primary/30 hover:text-foreground',
                  'active:bg-accent/80',
                  'transition-colors duration-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                {percent}%
              </button>
            ))
          }
          {showMaxButton && onMaxClick && (
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={isLoading || balance === undefined}
              aria-label={`Set maximum ${token.symbol} balance`}
              className={cn(
                'flex-1 rounded-lg border border-border px-2 py-1.5',
                'text-xs font-medium text-primary',
                'hover:bg-primary/10 hover:border-primary/30',
                'active:bg-primary/20',
                'transition-colors duration-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              MAX
            </button>
          )}
        </div>
      )}
    </div>
  )
}
