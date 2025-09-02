import type { FC } from 'react'
import type { QuoteResponse } from '@relayprotocol/relay-kit-hooks'
import { Flex, Text } from '../../primitives/index.js'
import type { Token } from '../../../types/index.js'
import type { FeeBreakdown } from '../../../types/FeeBreakdown.js'

export const PriceImpact: FC<{
  toToken?: Token
  isFetchingQuote?: boolean
  feeBreakdown?: FeeBreakdown
  quote?: QuoteResponse
}> = ({ toToken, isFetchingQuote, feeBreakdown, quote }) => {
  if (
    toToken &&
    quote?.details?.currencyOut?.amountUsd &&
    quote?.details?.currencyOut?.amountUsd !== '0' &&
    !isFetchingQuote
  ) {
    if (
      feeBreakdown?.isGasSponsored &&
      quote?.details?.totalImpact?.percent === '0'
    ) {
      return (
        <Flex css={{ gap: '2px' }}>
          <Text style="subtitle3" color="subtle">
            (
          </Text>
          <Text style="subtitle3" color="success">
            0%
          </Text>
          <Text
            style="subtitle3"
            color="subtle"
            css={{
              textDecoration: 'line-through'
            }}
          >
            0.01%
          </Text>
          <Text style="subtitle3" color="subtle">
            )
          </Text>
        </Flex>
      )
    } else if (feeBreakdown?.isGasSponsored) {
      return (
        <Flex css={{ gap: '2px' }}>
          <Text style="subtitle3" color="subtle">
            (
          </Text>
          <Text
            style="subtitle3"
            color={feeBreakdown?.totalFees.priceImpactColor}
          >
            {feeBreakdown?.totalFees.priceImpactPercentage}
          </Text>
          <Text style="subtitle3" color="success">
            Fee Subsidized
          </Text>
          <Text style="subtitle3" color="subtle">
            )
          </Text>
        </Flex>
      )
    } else {
      return (
        <Text
          style="subtitle3"
          color={feeBreakdown?.totalFees.priceImpactColor}
        >
          ({feeBreakdown?.totalFees.priceImpactPercentage})
        </Text>
      )
    }
  }

  return null
}
