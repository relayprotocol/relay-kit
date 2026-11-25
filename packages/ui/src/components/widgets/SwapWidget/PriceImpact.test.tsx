import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { PriceImpact } from './PriceImpact.js'
import { parseFees } from '../../../utils/quote.js'

const chain = { displayName: 'Base' } as any
const toToken = { symbol: 'ETH' } as any

const quote = (totalImpact: object | null, sponsored = false) =>
  ({
    fees: {
      sponsored: {
        usd: sponsored ? '0.05' : '0',
        amount: sponsored ? '50000' : '0',
        amountFormatted: sponsored ? '0.05' : '0'
      }
    },
    details: {
      currencyIn: { amountUsd: null },
      currencyOut: { amountUsd: '9.94' },
      totalImpact
    }
  }) as any

const renderImpact = (q: any) =>
  render(
    <PriceImpact
      toToken={toToken}
      quote={q}
      feeBreakdown={parseFees(chain, chain, q)}
    />
  ).container.textContent

describe('PriceImpact', () => {
  it('renders nothing when /quote/v3 returns a null price impact', () => {
    expect(renderImpact(quote(null))).toBe('')
    expect(renderImpact(quote(null, true))).toBe('')
  })

  it('renders the percentage when price impact is known', () => {
    expect(renderImpact(quote({ usd: '-0.06', percent: '-0.60' }))).toBe(
      '(-0.60%)'
    )
    expect(renderImpact(quote({ usd: '0', percent: '0' }, true))).toBe(
      '(0%0.01%)'
    )
  })
})
