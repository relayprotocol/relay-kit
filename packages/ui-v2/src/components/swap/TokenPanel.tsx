import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import { AmountInput } from './AmountInput.js'
import { AmountModeToggle } from './AmountModeToggle.js'
import { BalanceDisplay } from './BalanceDisplay.js'
import { ChainTokenIcon } from './ChainTokenIcon.js'
import { Skeleton } from '@/components/ui/skeleton.js'
import type { Token } from '@/types/token.js'
import { formatUnits } from 'viem'

interface TokenPanelProps {
  side: 'from' | 'to'
  /** Label shown at top-left of the panel (e.g. 'Sell' or 'Buy') */
  label?: string
  token?: Token
  onSelectToken: () => void
  amount: string
  onAmountChange: (value: string) => void
  /** USD value of the amount, already formatted (e.g. '~$123.45') */
  amountUsd?: string
  balance?: bigint
  hasPendingBalance?: boolean
  isLoadingBalance?: boolean
  onMaxClick?: () => void
  /** Called when a percentage button is clicked (from side only) */
  onPercentClick?: (percent: number) => void
  /** When true, the amount input is read-only (output side while fetching) */
  disabled?: boolean
  /** Show USD value below the amount (only relevant for to-side) */
  showAmountUsd?: boolean
  /** When true, input is in USD mode — shows $ prefix */
  isUsdMode?: boolean
  /** Callback to toggle USD / token mode */
  onToggleUsdMode?: () => void
  /** The "other" value shown in the toggle row (e.g. token amount when in USD mode) */
  usdToggleDisplay?: string
  /** True while the toggle display value is loading */
  isLoadingToggleValue?: boolean
  /** Show skeleton in place of amount when the quote is loading */
  isLoadingQuote?: boolean
  /** When true, shows the balance in red (user entered more than their balance) */
  isOverBalance?: boolean
  /**
   * Optional slot rendered at the top-right of the label row.
   * Used to embed wallet selectors (OriginWalletSelector / RecipientSelector)
   * compactly inside the panel header.
   */
  walletSlot?: React.ReactNode
  onAnalyticEvent?: (eventName: string, data?: Record<string, unknown>) => void
  className?: string
}

/**
 * One side of the swap widget (either "from" or "to").
 * Shows the amount input on the left and the token selector button on the right.
 * The outer container highlights with a ring when the amount input is focused.
 *
 * Layout:
 * ┌──────────────────────────────────────┐
 * │ [Amount input]    [Token selector ▾] │
 * │ [USD mode toggle]                    │
 * │             Balance: X.XX TOKEN      │
 * │ [20%] [50%] [MAX]   (from side only) │
 * │─────────────────────── (divider)     │
 * │ [walletSlot]           (optional)    │
 * └──────────────────────────────────────┘
 */
export const TokenPanel: React.FC<TokenPanelProps> = ({
  side,
  label,
  token,
  onSelectToken,
  amount,
  onAmountChange,
  amountUsd,
  balance,
  hasPendingBalance,
  isLoadingBalance = false,
  onMaxClick,
  onPercentClick,
  disabled = false,
  showAmountUsd = false,
  isUsdMode = false,
  onToggleUsdMode,
  usdToggleDisplay,
  isLoadingToggleValue = false,
  isLoadingQuote = false,
  isOverBalance = false,
  walletSlot,
  onAnalyticEvent,
  className
}) => {
  const [isFocused, setIsFocused] = React.useState(false)
  const balanceId = `${side}-balance-display`
  const amountId = `${side}-amount-input`

  const handleMaxClick = React.useCallback(() => {
    if (balance !== undefined && token) {
      const formatted = formatUnits(balance, token.decimals)
      onAmountChange(formatted)
      onMaxClick?.()
    }
  }, [balance, token, onAmountChange, onMaxClick])

  const handlePercentClick = React.useCallback((percent: number) => {
    if (balance !== undefined && token) {
      const totalUnits = balance
      const partialUnits = (totalUnits * BigInt(percent)) / BigInt(100)
      const formatted = formatUnits(partialUnits, token.decimals)
      onAmountChange(formatted)
      onPercentClick?.(percent)
    }
  }, [balance, token, onAmountChange, onPercentClick])

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card px-4 py-4',
        'flex flex-col gap-1.5',
        'transition-colors duration-150',
        isFocused ? 'border-ring shadow-sm' : 'border-border',
        className
      )}
    >
      {/* Label row: left = Sell/Buy label, right = wallet slot (optional) */}
      {(label || walletSlot) && (
        <div className="flex items-center justify-between gap-2 min-h-[20px]">
          {label ? (
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          ) : (
            <span />
          )}
          {walletSlot && (
            <div className="shrink-0">{walletSlot}</div>
          )}
        </div>
      )}

      {/* Top row: amount input (left) + token selector (right) */}
      <div className="flex items-center gap-3">
        {/* Amount input on left */}
        <div className="flex-1 min-w-0">
          <AmountInput
            id={amountId}
            side={side}
            value={amount}
            onChange={onAmountChange}
            disabled={disabled || (side === 'to' && isLoadingQuote)}
            prefixSymbol={isUsdMode ? '$' : undefined}
            describedBy={balanceId}
            onAnalyticEvent={onAnalyticEvent}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={side === 'to' && isLoadingQuote ? 'opacity-60' : undefined}
          />
        </div>

        {/* Token selector trigger on right */}
        <button
          type="button"
          onClick={onSelectToken}
          aria-label={
            token
              ? `Select ${side} token. Currently ${token.symbol} on chain ${token.chainId}`
              : `Select ${side} token`
          }
          className={cn(
            'flex items-center gap-2 rounded-full min-h-[44px] shrink-0',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'transition-colors duration-150',
            token
              ? 'px-3 py-1.5 border border-border bg-background hover:bg-accent max-w-[180px]'
              : 'px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 font-semibold text-sm'
          )}
        >
          {token ? (
            <>
              <ChainTokenIcon
                tokenLogoURI={token.logoURI}
                tokenSymbol={token.symbol}
                chainId={token.chainId}
                size="sm"
              />
              <span className="text-sm font-semibold truncate">{token.symbol}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            </>
          ) : (
            <>
              <span className="whitespace-nowrap">Select token</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      {/* USD mode toggle row */}
      {onToggleUsdMode && usdToggleDisplay !== undefined && (
        <AmountModeToggle
          displayValue={usdToggleDisplay}
          isLoading={isLoadingToggleValue}
          onToggle={onToggleUsdMode}
        />
      )}

      {/* Bottom section: balance + action buttons */}
      {side === 'from' ? (
        <BalanceDisplay
          id={balanceId}
          token={token}
          balance={balance}
          isLoading={isLoadingBalance}
          hasPendingBalance={hasPendingBalance}
          showMaxButton={!!token && !!balance}
          showPercentButtons={!!token && !!balance}
          onMaxClick={handleMaxClick}
          onPercentClick={handlePercentClick}
          isOverBalance={isOverBalance}
          onAnalyticEvent={onAnalyticEvent}
        />
      ) : (
        <div className="flex items-center justify-between gap-2">
          {/* USD value for output side */}
          <span className="text-xs text-muted-foreground flex-1" />
          <div className="flex flex-col items-end gap-0.5">
            <span id={balanceId} className="text-xs text-muted-foreground">
              {isLoadingBalance ? (
                <Skeleton className="h-3 w-16" />
              ) : (
                balance !== undefined && token
                  ? `Balance: ${formatUnits(balance, token.decimals).slice(0, 8)} ${token.symbol}`
                  : '\u00A0'
              )}
            </span>
            {showAmountUsd && amountUsd && (
              <span className="text-xs text-muted-foreground">{amountUsd}</span>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
