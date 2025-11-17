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

  // Relay fee
  const relayFee = feeBreakdown?.breakdown?.find(
    (fee) => fee.id === 'relayer-fee'
  )
  const relayFeeUsd =
    relayFee?.usd.value ??
    (quote?.fees?.relayerService?.amountUsd !== undefined
      ? -Number(quote.fees.relayerService.amountUsd)
      : undefined)

  // Swap impact
  const swapImpactUsd =
    feeBreakdown?.totalFees?.swapImpact?.value ??
    (quote?.details?.swapImpact?.usd !== undefined
      ? Number(quote.details.swapImpact.usd)
      : undefined)

  // Destination gas (fill gas)
  const destinationGas = feeBreakdown?.breakdown?.find(
    (fee) => fee.id === 'destination-gas'
  )
  const fillGasUsd =
    destinationGas?.usd.value ??
    (quote?.fees?.relayerGas?.amountUsd !== undefined
      ? -Number(quote.fees.relayerGas.amountUsd)
      : undefined)

  const fillGasLabel = destinationGas?.name ?? 'Fill Gas'

  // App fee
  const appFee = feeBreakdown?.breakdown?.find((fee) => fee.id === 'app-fee')
  const appFeeUsd =
    appFee?.usd.value ??
    (quote?.fees?.app?.amountUsd !== undefined
      ? Number(quote.fees.app.amountUsd)
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
  const fillGasFormatted = formatDollar(
    fillGasUsd !== undefined ? Math.abs(fillGasUsd) : undefined
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

          {/* Fill Gas Row */}
          {fillGasUsd !== undefined && fillGasFormatted !== '-' && (
            <Flex align="center" css={{ width: '100%', mb: '2' }}>
              <Text style="subtitle2" color="subtle" css={{ mr: 'auto' }}>
                {fillGasLabel}
              </Text>
              {feeBreakdown?.isGasSponsored && fillGasUsd === 0 ? (
                <Text style="subtitle2" color="success">
                  Free
                </Text>
              ) : (
                <Text style="subtitle2">{fillGasFormatted}</Text>
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
