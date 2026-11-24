import { describe, expect, it } from 'vitest'
import { parseFees } from './quote.js'

const base = { displayName: 'Base' } as any
const optimism = { displayName: 'Optimism' } as any

const usd = (value: string) => ({
  amount: value === '0' ? '0' : '1',
  amountFormatted: value,
  usd: value
})
const part = (totalUsd: string, sponsoredUsd: string, userPaysUsd: string) => ({
  total: { amountUsd: totalUsd },
  sponsored: { amountUsd: sponsoredUsd },
  userPays: { amountUsd: userPaysUsd }
})

const quote = (feeSponsorship?: object, swapUsd = '-0.004986') =>
  ({
    fees: {
      swap: usd(swapUsd),
      execution: usd('-0.020007'),
      platform: usd('-0.029995'),
      app: usd('0'),
      sponsored: usd(feeSponsorship ? '0.010003' : '0.054988')
    },
    feeSponsorship,
    details: {}
  }) as any

const row = (fees: ReturnType<typeof parseFees>, id: string) =>
  fees?.breakdown.find((fee) => fee.id === id)?.usd.value

describe('parseFees', () => {
  it('shows what the user pays for each component under partial sponsorship', () => {
    const fees = parseFees(
      optimism,
      base,
      quote(
        {
          quoted: {
            components: {
              execution: part('0.020007', '0.010003', '0.010004'),
              swap: part('0.004986', '0', '0.004986'),
              platform: part('0.029995', '0', '0.029995'),
              app: part('0', '0', '0')
            }
          }
        },
        '-0.116638'
      )
    )

    expect(row(fees, 'destination-gas')).toBeCloseTo(-0.010004)
    expect(row(fees, 'relayer-fee')).toBeCloseTo(-0.029995)
    expect(fees?.totalFees.swapImpact?.value).toBeCloseTo(-0.116638)
  })

  it('shows sponsored components as zero when fully covered', () => {
    const fees = parseFees(
      optimism,
      base,
      quote({
        quoted: {
          components: {
            execution: part('0.020007', '0.020007', '0'),
            swap: part('0.004986', '0.004986', '0'),
            platform: part('0.029995', '0.029995', '0'),
            app: part('0', '0', '0')
          }
        }
      })
    )

    expect(row(fees, 'destination-gas')).toBe(0)
    expect(row(fees, 'relayer-fee')).toBe(0)
    expect(fees?.totalFees.swapImpact?.value).toBe(0)
  })

  it('treats execution and platform as covered when sponsored without a breakdown', () => {
    const fees = parseFees(optimism, base, quote())

    expect(row(fees, 'destination-gas')).toBe(0)
    expect(row(fees, 'relayer-fee')).toBe(0)
    expect(fees?.totalFees.swapImpact?.value).toBeCloseTo(-0.004986)
  })
})
