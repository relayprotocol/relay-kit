import { safeStructuredClone } from './structuredClone.js'

type QuoteUsdNode = {
  amountUsd?: string
  amountUsdCurrent?: string
  [key: string]: unknown
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const normalizeNode = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(normalizeNode)
    return
  }

  if (!isObject(value)) {
    return
  }

  const node = value as QuoteUsdNode
  if (typeof node.amountUsdCurrent === 'string' && node.amountUsdCurrent.length) {
    node.amountUsd = node.amountUsdCurrent
  }

  Object.values(node).forEach(normalizeNode)
}

export const normalizeQuoteUsdFields = <T>(quote: T): T => {
  const normalized = safeStructuredClone(quote)
  normalizeNode(normalized)
  return normalized
}
