import type { ComponentPropsWithoutRef } from 'react'
import type { BridgeFee } from './BridgeFee.js'
import type { Text } from '../components/primitives/index.js'

export type FeeBreakdown = {
  breakdown: BridgeFee[]
  totalFees: {
    usd?: string
    priceImpactPercentage?: string
    priceImpact?: string
    priceImpactColor?: ComponentPropsWithoutRef<typeof Text>['color']
    swapImpact?: {
      value: number
      formatted: string
    }
  }
  isGasSponsored: boolean
} | null
