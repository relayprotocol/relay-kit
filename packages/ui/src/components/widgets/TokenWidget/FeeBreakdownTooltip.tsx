import type { FC, ReactNode } from 'react'
import { Flex, Text } from '../../primitives/index.js'
import Tooltip from '../../primitives/Tooltip.js'
import type { QuoteResponse } from '@relayprotocol/relay-kit-hooks'
import type { FeeBreakdown } from '../../../types/FeeBreakdown.js'
import { formatDollar, formatNumber } from '../../../utils/numbers.js'

type FeeBreakdownTooltipProps = {
  quote?: QuoteResponse
  feeBreakdown?: FeeBreakdown
  fromToken?: { symbol: string }
  children: ReactNode
  tooltipProps?: any
}

export const FeeBreakdownTooltip: FC<FeeBreakdownTooltipProps> = ({
  quote,
  feeBreakdown,
  fromToken,
  children,
  tooltipProps
}) => {
  const currencyInAmount = quote?.details?.currencyIn?.amountUsd
  const currencyInAmountFormatted = quote?.details?.currencyIn?.amountFormatted
  const expandedPriceImpact = quote?.details?.expandedPriceImpact

  // Relay fee
  const relayFee = feeBreakdown?.breakdown?.find(
    (fee) => fee.id === 'relayer-fee'
  )
  const relayFeeUsd =
    relayFee?.usd.value ??
    (expandedPriceImpact?.relay?.usd !== undefined
      ? Number(expandedPriceImpact.relay.usd)
      : undefined)

  // Swap impact
  const swapImpactUsd =
    feeBreakdown?.totalFees?.swapImpact?.value ??
    (expandedPriceImpact?.swap?.usd !== undefined
      ? Number(expandedPriceImpact.swap.usd)
      : undefined)

  // Execution fee
  const executionFee = feeBreakdown?.breakdown?.find(
    (fee) => fee.id === 'destination-gas'
  )
  const executionFeeUsd =
    executionFee?.usd.value ??
    (expandedPriceImpact?.execution?.usd !== undefined
      ? Number(expandedPriceImpact.execution.usd)
      : undefined)

  const executionFeeLabel = executionFee?.name ?? 'Execution Fee'

  // App fee
  const appFee = feeBreakdown?.breakdown?.find((fee) => fee.id === 'app-fee')
  const appFeeUsd =
    appFee?.usd.value ??
    (expandedPriceImpact?.app?.usd !== undefined
      ? Number(expandedPriceImpact.app.usd)
      : undefined)

  const tokenAmountFormatted = formatDollar(
    currencyInAmount !== undefined ? Number(currencyInAmount) : undefined
  )
  const relayFeeFormatted = formatDollar(
    relayFeeUsd !== undefined ? Math.abs(relayFeeUsd) : undefined
  )
  const swapImpactFormatted = formatDollar(
    swapImpactUsd !== undefined ? Math.abs(swapImpactUsd) : undefined
  )
  const executionFeeFormatted = formatDollar(
    executionFeeUsd !== undefined ? Math.abs(executionFeeUsd) : undefined
  )
  const appFeeFormatted =
    appFee?.usd.formatted ??
    formatDollar(appFeeUsd !== undefined ? Math.abs(appFeeUsd) : undefined)

  return (
    <Tooltip
      content={
        <Flex css={{ minWidth: 240 }} direction="column">
          {/* Token Amount Row */}
          {fromToken && currencyInAmount && tokenAmountFormatted !== '-' && (
            <Flex align="center" css={{ width: '100%', mb: '2' }}>
              <Text style="subtitle2" color="subtle" css={{ mr: 'auto' }}>
                {currencyInAmountFormatted && currencyInAmountFormatted !== '-'
                  ? `${formatNumber(currencyInAmountFormatted, 4, true)} ${fromToken.symbol}`
                  : fromToken.symbol}
              </Text>
              <Text style="subtitle2">{tokenAmountFormatted}</Text>
            </Flex>
          )}

          {/* Relay Fee Row */}
          {relayFeeUsd !== undefined && relayFeeFormatted !== '-' && (
            <Flex align="center" css={{ width: '100%', mb: '2' }}>
              <Text style="subtitle2" color="subtle" css={{ mr: 'auto' }}>
                {relayFee?.name ?? 'Relay Fee'}
              </Text>
              {feeBreakdown?.isGasSponsored && relayFeeUsd === 0 ? (
                <Text style="subtitle2" color="success">
                  Free
                </Text>
              ) : (
                <Text style="subtitle2">{relayFeeFormatted}</Text>
              )}
            </Flex>
          )}

          {/* Swap Impact Row */}
          {swapImpactUsd !== undefined && swapImpactFormatted !== '-' && (
            <Flex align="center" css={{ width: '100%', mb: '2' }}>
              <Text style="subtitle2" color="subtle" css={{ mr: 'auto' }}>
                Swap Impact
              </Text>
              <Text style="subtitle2">{swapImpactFormatted}</Text>
            </Flex>
          )}

          {/* Execution Fee Row */}
          {executionFeeUsd !== undefined && executionFeeFormatted !== '-' && (
            <Flex align="center" css={{ width: '100%', mb: '2' }}>
              <Text style="subtitle2" color="subtle" css={{ mr: 'auto' }}>
                {executionFeeLabel}
              </Text>
              {feeBreakdown?.isGasSponsored && executionFeeUsd === 0 ? (
                <Text style="subtitle2" color="success">
                  Free
                </Text>
              ) : (
                <Text style="subtitle2">{executionFeeFormatted}</Text>
              )}
            </Flex>
          )}

          {/* App Fee Row */}
          {appFee && appFeeUsd !== undefined && appFeeFormatted !== '-' && (
            <Flex align="center" css={{ width: '100%' }}>
              <Text style="subtitle2" color="subtle" css={{ mr: 'auto' }}>
                {appFee.name}
              </Text>
              {feeBreakdown?.isGasSponsored && appFeeUsd === 0 ? (
                <Text style="subtitle2" color="success">
                  Free
                </Text>
              ) : (
                <Text style="subtitle2">{appFeeFormatted}</Text>
              )}
            </Flex>
          )}
        </Flex>
      }
      {...tooltipProps}
    >
      {children}
    </Tooltip>
  )
}
