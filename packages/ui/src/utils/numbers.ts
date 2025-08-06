import { formatUnits } from 'viem'
import { isSafariBrowser } from './browser.js'

const { format: formatUsdCurrency } = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
})

function formatDollar(price?: number | null) {
  if (price === undefined || price === null || price === 0) {
    return '-'
  }

  // For values >= $1B, show ">$1B"
  if (Math.abs(price) >= 1000000000) {
    return '>$1B'
  }

  const formatted = formatUsdCurrency(price)

  if (formatted === '$0.00' && price && price > 0) {
    return '< $0.01'
  }
  return formatted
}

function formatNumber(
  amount: number | null | undefined | string,
  maximumFractionDigits: number = 2,
  compact?: boolean
) {
  const { format } = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: maximumFractionDigits,
    notation: compact ? 'compact' : 'standard'
  })
  if (!amount) {
    return '-'
  }

  const numAmount = Number(amount)

  if (numAmount >= 1000000000) {
    return '>1B'
  }

  // Handle very small positive values
  if (numAmount > 0) {
    const threshold = Math.pow(10, -maximumFractionDigits)
    if (numAmount < threshold) {
      const thresholdStr = threshold.toFixed(maximumFractionDigits)
      return `< ${thresholdStr}`
    }
  }

  return format(numAmount).replace(/\.?0+$/, '')
}

const truncateFractionAndFormat = (
  parts: Intl.NumberFormatPart[],
  digits: number
) => {
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
 *  Convert ETH values to human readable formats
 * @param amount An ETH amount
 * @param maximumFractionDigits Number of decimal digits
 * @param decimals Number of decimal digits for the atomic unit
 * @param compact A boolean value used to specify the formatting notation
 * @returns returns the ETH value as a `string` or `-` if the amount is `null` or `undefined`
 */
function formatBN(
  amount: string | number | bigint | null | undefined,
  maximumFractionDigits: number,
  decimals: number = 18,
  compact: boolean = true,
  formatOptionsParam: Intl.NumberFormatOptions = {}
) {
  if (typeof amount === 'undefined' || amount === null) return '-'

  const amountToFormat =
    typeof amount === 'number'
      ? amount
      : +formatUnits(BigInt(amount), decimals ?? 18)

  if (amountToFormat === 0) {
    return `${amountToFormat}`
  }

  const amountFraction = `${amount}`.split('.')[1]
  const isSafari = isSafariBrowser()
  const formatOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 20,
    useGrouping: true,
    notation: compact ? 'compact' : 'standard',
    compactDisplay: 'short',
    ...formatOptionsParam
  }

  // New issue introduced in Safari v16 causes a regression and now need lessPrecision flagged in format options
  if (isSafari) {
    //@ts-ignore
    formatOptions.roundingPriority = 'lessPrecision'
  }

  const parts = new Intl.NumberFormat('en-US', formatOptions).formatToParts(
    amountToFormat
  )

  // Safari has a few bugs with the fraction part of formatToParts, sometimes rounding when unnecessary and
  // when amount is in the thousands not properly representing the value in compact display. Until the bug is fixed
  // this workaround should help. bugzilla bug report: https://bugs.webkit.org/show_bug.cgi?id=249231
  // Update: this has been fixed, but still applied for >v15.3 and <v16

  if (isSafari) {
    const partTypes = parts.map((part) => part.type)
    const partsIncludesFraction = partTypes.includes('fraction')
    const partsIncludeCompactIdentifier = partTypes.includes('compact')
    if (amountFraction) {
      if (!partsIncludesFraction && !partsIncludeCompactIdentifier) {
        const integerIndex = parts.findIndex((part) => part.type === 'integer')
        parts.splice(
          integerIndex + 1,
          0,
          {
            type: 'decimal',
            value: '.'
          },
          {
            type: 'fraction',
            value: amountFraction
          }
        )
      }
    } else if (!partsIncludesFraction && partsIncludeCompactIdentifier) {
      const compactIdentifier = parts.find((part) => part.type === 'compact')
      const integerIndex = parts.findIndex((part) => part.type === 'integer')
      const integer = parts[integerIndex]
      if (compactIdentifier?.value === 'K' && integer) {
        const fraction = `${amount}`.replace(integer.value, '')[0]
        if (fraction && Number(fraction) > 0) {
          parts.splice(
            integerIndex + 1,
            0,
            {
              type: 'decimal',
              value: '.'
            },
            {
              type: 'fraction',
              value: fraction
            }
          )
        }
      }
    }
  }

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

function truncateBalance(balance: string) {
  let formattedBalance = parseFloat(balance ? balance.substring(0, 6) : '0')
  if (formattedBalance === 0) {
    formattedBalance = 0
  }
  return formattedBalance
}

/**
 * Formats a number represented by a string, ensuring the total length does not exceed a specified number of characters.
 * @param amount The string to format
 * @param maxLength The maximum total length of the string representation.
 * @returns A plain string representation of the number, trimmed to the specified length.
 */

function formatFixedLength(amount: string, maxLength: number) {
  if (!/^[-+]?\d*\.?\d*$/.test(amount)) return 'Invalid number'

  const isNegative = amount.startsWith('-')
  let result = amount.replace(/^-/, '') // Remove negative sign for now

  if (result.includes('.')) {
    const parts = result.split('.')
    const integerPart = parts[0]
    const decimalPart = parts[1] || ''

    // Calculate how many characters are left for the decimal part
    const availableSpace = maxLength - integerPart.length

    if (integerPart.length >= maxLength) {
      // If the integer part alone exceeds the maximum length, return just the integer part
      result = integerPart
    } else {
      // Include as much of the decimal part as possible without exceeding the total length
      result = integerPart + '.' + decimalPart.substring(0, availableSpace)
    }
  }

  // Ensure no unnecessary trailing zeros and remove any trailing decimal points
  result = result
    .replace(/\.0+$/, '')
    .replace(/\.(\d*[^0])0+$/, '.$1')
    .replace(/\.$/, '')

  // Add negative sign back if the number was negative
  if (isNegative) {
    result = '-' + result
  }

  return result
}

/**
 * Formats a numeric string for display with comma separators while preserving decimal precision
 * @param value The input value as string
 * @returns Formatted string with commas, or original value if invalid
 */
function formatNumberInput(value: string): string {
  if (!value || value === '') return value

  if (value === '0' || value === '0.' || value.startsWith('0.')) return value

  // Handle decimal input case (e.g., "123.", etc.)
  if (value.endsWith('.')) {
    const integerPart = value.slice(0, -1)
    if (integerPart === '0' || integerPart === '') return value

    const formatted = new Intl.NumberFormat('en-US', {
      useGrouping: true
    }).format(Number(integerPart))
    return formatted + '.'
  }

  const numValue = Number(value)
  if (isNaN(numValue)) return value

  if (numValue === 0) return value

  if (numValue >= 1000000000) return '>1B'

  const parts = value.split('.')
  const integerPart = parts[0]
  const decimalPart = parts[1]

  const formattedInteger = new Intl.NumberFormat('en-US', {
    useGrouping: true
  }).format(Number(integerPart))

  // Reconstruct with decimal if present, preserving trailing zeros in decimal part
  return decimalPart !== undefined
    ? `${formattedInteger}.${decimalPart}`
    : formattedInteger
}

export {
  formatDollar,
  formatBN,
  formatFixedLength,
  formatNumber,
  formatNumberInput,
  truncateBalance
}
