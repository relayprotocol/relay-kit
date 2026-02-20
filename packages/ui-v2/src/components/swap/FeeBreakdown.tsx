import * as React from 'react'
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { ChevronDown, Clock, Info, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip.js'
import type { FeeBreakdown as FeeBreakdownType } from '@/types/fee.js'
import type { useQuote } from '@relayprotocol/relay-kit-hooks'
import { formatUnits } from 'viem'

const FEES_LEARN_MORE_URL =
  'https://docs.relay.link/references/api/api_core_concepts/fees#relay-fees'

interface FeeBreakdownProps {
  feeBreakdown?: FeeBreakdownType | null
  isFetchingQuote?: boolean
  /** Formatted rate string (e.g., "1 ETH ≈ 2,845 USDC") */
  rateDisplay?: string
  timeEstimate?: { time: number; formattedTime: string }
  /** Current slippage tolerance (undefined = auto) */
  slippageTolerance?: string
  /** Whether slippage is in auto mode */
  isAutoSlippage?: boolean
  /** Formatted origin gas USD cost (from fee breakdown) */
  originGasUsd?: string
  /** Raw quote data — used to display actual slippage from the quote */
  quote?: ReturnType<typeof useQuote>['data']
  className?: string
}

/**
 * Collapsible fee breakdown card.
 *
 * Shows a "Fetching the best price…" loading row while the quote is in flight.
 * Once the quote is available, shows rate, time estimate, collapsible fee details,
 * and the effective slippage from the quote (with a min-received tooltip).
 */
export const FeeBreakdown: React.FC<FeeBreakdownProps> = ({
  feeBreakdown,
  isFetchingQuote = false,
  rateDisplay,
  timeEstimate,
  slippageTolerance,
  isAutoSlippage = true,
  originGasUsd,
  quote,
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false)

  // Show the card if we're fetching OR have a breakdown
  if (!isFetchingQuote && !feeBreakdown) return null

  // Slippage from the quote (if available), otherwise from user setting
  // Cast needed because the TypeScript type doesn't expose slippageTolerance
  // even though the API returns it at runtime
  const quoteAny = quote as Record<string, any> | undefined
  const quoteSlippagePercent: string | null =
    quoteAny?.slippageTolerance?.origin?.percent ??
    quoteAny?.slippageTolerance?.destination?.percent ??
    null

  const slippageLabel = quoteSlippagePercent
    ? `${parseFloat(quoteSlippagePercent).toFixed(2)}%`
    : slippageTolerance
    ? `${slippageTolerance}%`
    : 'Auto'

  const showAutoSlippage = !quoteSlippagePercent && (isAutoSlippage || !slippageTolerance)

  // Compute minimum received for slippage tooltip
  const minReceived = React.useMemo(() => {
    if (!quote?.details?.currencyOut) return null
    const amount = quote.details.currencyOut.amount
    const decimals = quote.details.currencyOut.currency?.decimals
    const symbol = quote.details.currencyOut.currency?.symbol
    if (!amount || !decimals || !symbol) return null

    // Use quote slippage percent or user-set slippage
    const slippagePct = quoteSlippagePercent
      ? parseFloat(quoteSlippagePercent) / 100
      : slippageTolerance
      ? parseFloat(slippageTolerance) / 100
      : 0.005 // 0.5% default

    try {
      const amountBig = BigInt(amount)
      const minAmountBig = amountBig - (amountBig * BigInt(Math.floor(slippagePct * 10000))) / 10000n
      const formatted = parseFloat(formatUnits(minAmountBig, Number(decimals))).toFixed(6)
      return `${formatted} ${symbol}`
    } catch {
      return null
    }
  }, [quote, quoteSlippagePercent, slippageTolerance])

  const networkCost = originGasUsd ?? feeBreakdown?.breakdown?.find((f) => f.id === 'origin-gas')?.usd.formatted

  // Tooltip content for price impact ⓘ
  const priceImpactTooltip = feeBreakdown ? (
    <div className="flex flex-col gap-1.5 text-xs max-w-[220px]">
      {feeBreakdown.totalFees.swapImpact && (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Swap Impact</span>
          <span>{feeBreakdown.totalFees.swapImpact.formatted}</span>
        </div>
      )}
      {feeBreakdown.breakdown.find((f) => f.id === 'destination-gas') && (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Execution Fee</span>
          <span>
            {feeBreakdown.breakdown.find((f) => f.id === 'destination-gas')?.usd.formatted ?? '–'}
          </span>
        </div>
      )}
      {feeBreakdown.breakdown.find((f) => f.id === 'relayer-fee') && (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Relay Fee</span>
          <span>
            {feeBreakdown.breakdown.find((f) => f.id === 'relayer-fee')?.usd.formatted ?? '–'}
          </span>
        </div>
      )}
      <a
        href={FEES_LEARN_MORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-primary hover:underline mt-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        Learn more about fees
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </div>
  ) : null

  return (
    <TooltipProvider>
      <div
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          'rounded-2xl border bg-card px-4 py-3 text-sm flex flex-col gap-2',
          className
        )}
      >
        {/* Loading state — "Fetching the best price..." */}
        {isFetchingQuote && !feeBreakdown && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
            <span>Fetching the best price…</span>
          </div>
        )}

        {/* Slippage row — shown when quote is available */}
        {(feeBreakdown || (isFetchingQuote && feeBreakdown)) && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">
                Max Slippage:{' '}
                <span className="text-foreground font-medium">{slippageLabel}</span>
              </span>
              {/* Tooltip showing minimum amount received */}
              {minReceived && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="cursor-pointer text-muted-foreground hover:text-foreground focus-visible:outline-none"
                    >
                      <Info className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    Minimum received: {minReceived}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {showAutoSlippage && (
              <span className="text-[10px] font-medium text-muted-foreground border border-border rounded px-1.5 py-0.5">
                Auto
              </span>
            )}
          </div>
        )}

        {/* Collapsible: summary trigger + expanded details */}
        {feeBreakdown && (
          <CollapsiblePrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
            {/* Summary row — collapsible trigger */}
            <CollapsiblePrimitive.Trigger asChild>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls="fee-breakdown-details"
                className={cn(
                  'w-full flex items-center gap-2 rounded-lg py-0.5',
                  'hover:opacity-80 transition-opacity duration-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'text-xs text-muted-foreground'
                )}
              >
                {/* Rate + time + cost */}
                <div className="flex-1 flex items-center gap-2 min-w-0 text-left">
                  {isFetchingQuote ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden="true" />
                      <span className="text-xs text-muted-foreground/60">Refreshing…</span>
                    </div>
                  ) : rateDisplay ? (
                    <span className="truncate">{rateDisplay}</span>
                  ) : null}

                  {timeEstimate && !isFetchingQuote && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      <span>{timeEstimate.formattedTime}</span>
                    </div>
                  )}

                  {networkCost && !isFetchingQuote && (
                    <span className="shrink-0">{networkCost}</span>
                  )}
                </div>

                {/* Chevron toggle */}
                {!isFetchingQuote && (
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
                    aria-hidden="true"
                  />
                )}
              </button>
            </CollapsiblePrimitive.Trigger>

            {/* Expanded fee details */}
            <CollapsiblePrimitive.Content
              id="fee-breakdown-details"
              aria-hidden={!isOpen}
              className={cn(
                'overflow-hidden',
                'data-[state=open]:animate-[slide-down_200ms_ease-out]',
                'data-[state=closed]:animate-[slide-up_200ms_ease-in]'
              )}
            >
              <div className="mt-2 flex flex-col gap-2 border-t border-border/50 pt-2">
                {/* Estimated time */}
                {timeEstimate && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Estimated time</span>
                    <span className="text-foreground">{timeEstimate.formattedTime}</span>
                  </div>
                )}

                {/* Network cost */}
                {networkCost && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Network cost</span>
                    <span className="text-foreground">{networkCost}</span>
                  </div>
                )}

                {/* Price impact */}
                {feeBreakdown.totalFees.priceImpactPercentage && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Price Impact</span>
                      {priceImpactTooltip && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="cursor-pointer text-muted-foreground hover:text-foreground focus-visible:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Info className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="p-3">
                            {priceImpactTooltip}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <span
                      className={cn(
                        feeBreakdown.totalFees.priceImpactColor === 'red' && 'text-destructive',
                        feeBreakdown.totalFees.priceImpactColor === 'success' && 'text-green-500',
                        feeBreakdown.totalFees.priceImpactColor !== 'red' &&
                          feeBreakdown.totalFees.priceImpactColor !== 'success' &&
                          'text-foreground'
                      )}
                    >
                      {feeBreakdown.totalFees.priceImpactPercentage}
                    </span>
                  </div>
                )}

                {/* Gas sponsored */}
                {feeBreakdown.isGasSponsored && (
                  <div className="text-xs text-green-500 font-medium">
                    ✓ Gas sponsored
                  </div>
                )}
              </div>
            </CollapsiblePrimitive.Content>
          </CollapsiblePrimitive.Root>
        )}
      </div>
    </TooltipProvider>
  )
}
