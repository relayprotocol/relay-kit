import * as React from 'react'
import { cn } from '@/lib/utils.js'
import { EventNames } from '@/constants/events.js'

interface AmountInputProps {
  /** 'from' or 'to' — determines which analytics event fires on focus */
  side: 'from' | 'to'
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  /** When set, displays this symbol as a prefix (e.g. "$" for USD mode) */
  prefixSymbol?: string
  /** ID used for aria-labelledby association */
  id?: string
  /** aria-describedby — typically points to the balance display */
  describedBy?: string
  onAnalyticEvent?: (eventName: string, data?: Record<string, unknown>) => void
  onFocus?: () => void
  onBlur?: () => void
  className?: string
}

/**
 * Numeric amount input for the swap widget's from/to token panels.
 * Uses inputMode="decimal" for mobile numeric keyboards.
 * Restricts input to valid decimal numbers only.
 * Fires SWAP_INPUT_FOCUSED or SWAP_OUTPUT_FOCUSED on focus.
 */
export const AmountInput: React.FC<AmountInputProps> = ({
  side,
  value,
  onChange,
  disabled = false,
  placeholder = '0',
  prefixSymbol,
  id,
  describedBy,
  onAnalyticEvent,
  onFocus,
  onBlur,
  className
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value
    // Strip prefix symbol before validation/onChange
    if (prefixSymbol && raw.startsWith(prefixSymbol)) {
      raw = raw.slice(prefixSymbol.length)
    }
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      onChange(raw)
    }
  }

  const handleFocus = () => {
    const event =
      side === 'from' ? EventNames.SWAP_INPUT_FOCUSED : EventNames.SWAP_OUTPUT_FOCUSED
    onAnalyticEvent?.(event)
    onFocus?.()
  }

  const handleBlur = () => {
    onBlur?.()
  }

  const displayValue = prefixSymbol && value ? `${prefixSymbol}${value}` : value

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      pattern="^[0-9]*[.,]?[0-9]*$"
      placeholder={prefixSymbol ? `${prefixSymbol}0` : placeholder}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      aria-label={`${side === 'from' ? 'From' : 'To'} amount`}
      aria-describedby={describedBy}
      className={cn(
        'w-full bg-transparent',
        'text-2xl sm:text-3xl font-semibold',
        'border-none outline-none ring-0 focus:ring-0 focus:outline-none',
        'placeholder:text-muted-foreground/40',
        'truncate',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    />
  )
}
