import { formatUnits } from 'viem'

const { format: formatUsdCurrency } = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
})

/**
 * Formats a number as a USD currency string.
 * Returns '-' for null/undefined/0 values.
 * Returns '< $0.01' for very small positive values.
 * Returns '>$1B' for values >= 1 billion.
 */
export function formatDollar(price?: number | null): string {
  if (price === undefined || price === null || price === 0) {
    return '-'
  }

  if (Math.abs(price) >= 1_000_000_000) {
    return '>$1B'
  }

  const formatted = formatUsdCurrency(price)

  if (formatted === '$0.00' && price && price > 0) {
    return '< $0.01'
  }
  return formatted
}

/**
 * Formats a number as a compact USD currency string (e.g., "$1.2K", "$3.4M").
 * Useful for displaying large values in space-constrained UIs.
 */
export function formatDollarCompact(price?: number | null): string {
  if (price === undefined || price === null || price === 0) {
    return '-'
  }

  if (Math.abs(price) >= 1_000_000_000) {
    return '>$1B'
  }

  if (Math.abs(price) >= 1000) {
    const { format } = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
    return format(price)
  }

  const formatted = formatUsdCurrency(price)
  if (formatted === '$0.00' && price && price > 0) {
    return '< $0.01'
  }
  return formatted
}

/**
 * Formats a plain number with optional compact notation.
 * Returns '-' for null/undefined/falsy values.
 */
export function formatNumber(
  amount: number | null | undefined | string,
  maximumFractionDigits: number = 2,
  compact?: boolean
): string {
  const { format } = new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    notation: compact ? 'compact' : 'standard'
  })

  if (!amount) return '-'

  const numAmount = Number(amount)
  if (numAmount >= 1_000_000_000) return '>1B'

  if (numAmount > 0) {
    const threshold = Math.pow(10, -maximumFractionDigits)
    if (numAmount < threshold) {
      return `< ${threshold.toFixed(maximumFractionDigits)}`
    }
  }

  return format(numAmount).replace(/\.?0+$/, '')
}

const truncateFractionAndFormat = (
  parts: Intl.NumberFormatPart[],
  digits: number
): string => {
  return parts
    .map(({ type, value }) => {
      if (type !== 'fraction' || !value || value.length < digits) {
        return value
      }
      let formattedValue = ''
      for (let idx = 0; idx < value.length && idx < digits; idx++) {
        formattedValue += value[idx]
      }
      return formattedValue
    })
    .reduce((string, part) => string + part)
}

/**
 * Converts a bigint token amount to a human-readable formatted string.
 * Handles compact notation, Safari-specific formatting bugs, and very small values.
 *
 * @param amount - The raw token amount (bigint, string, or number)
 * @param maximumFractionDigits - Max decimal digits to show
 * @param decimals - Token decimal places (default 18 for ETH)
 * @param compact - Whether to use compact notation (e.g., "1.2K")
 */
export function formatBN(
  amount: string | number | bigint | null | undefined,
  maximumFractionDigits: number,
  decimals: number = 18,
  compact: boolean = true,
  formatOptionsParam: Intl.NumberFormatOptions = {}
): string {
  if (typeof amount === 'undefined' || amount === null) return '-'

  const amountToFormat =
    typeof amount === 'number'
      ? amount
      : +formatUnits(BigInt(amount), decimals ?? 18)

  if (amountToFormat === 0) {
    return `${amountToFormat}`
  }

  const formatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 20,
    useGrouping: true,
    notation: compact ? 'compact' : 'standard',
    compactDisplay: 'short',
    ...formatOptionsParam
  }

  const parts = new Intl.NumberFormat('en-US', formatOptions).formatToParts(
    amountToFormat
  )

  if (parts && parts.length > 0) {
    const lowestValue = Number(
      `0.${new Array(maximumFractionDigits).join('0')}1`
    )
    if (amountToFormat > 1000) {
      return truncateFractionAndFormat(parts, 1)
    } else if (amountToFormat < 1 && amountToFormat < lowestValue) {
      return `< ${lowestValue}`
    } else {
      return truncateFractionAndFormat(parts, maximumFractionDigits)
    }
  } else {
    return typeof amount === 'string' || typeof amount === 'number'
      ? `${amount}`
      : ''
  }
}

/**
 * Converts basis points to a percentage string (e.g., "250" → "2.5").
 * Returns undefined if the input is invalid.
 */
export function convertBpsToPercent(bps?: string): string | undefined {
  if (bps === undefined) return undefined
  const numeric = Number(bps)
  if (!Number.isFinite(numeric)) return undefined
  const percent = numeric / 100
  if (!Number.isFinite(percent)) return undefined
  const formatted = percent.toFixed(percent % 1 === 0 ? 0 : 2)
  return formatted.replace(/\.0+$/, '').replace(/\.00$/, '')
}
