export type SlippageToleranceMode = 'Auto' | 'Custom'

export type SlippageRating = 'low' | 'high' | 'very-high'

export const ratingToColor = {
  'very-high': 'red11',
  high: 'amber11',
  low: undefined
} as const

export function getSlippageRating(slippage: string): SlippageRating {
  const slippageNumber = parseFloat(slippage)
  if (slippageNumber >= 40) return 'very-high'
  if (slippageNumber >= 6) return 'high'
  return 'low'
}
