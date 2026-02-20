import type { FC, ReactNode } from 'react'
import { Anchor, Flex, Text } from '../primitives/index.js'
import Tooltip from '../primitives/Tooltip.js'
import type { ChildrenProps } from '../widgets/SwapWidgetRenderer.js'

type PriceImpactTooltipProps = {
  feeBreakdown: ChildrenProps['feeBreakdown']
  children: ReactNode
  tooltipProps?: any
}

const getFeeColor = (value: number | undefined) => {
  if (value === 0 || value === undefined) return undefined
  return value > 0 ? 'success' : undefined
}

export const PriceImpactTooltip: FC<PriceImpactTooltipProps> = ({
  feeBreakdown,
  children,
  tooltipProps
}) => {
  return (
    <Tooltip
      content={
        <Flex className="relay-min-w-[200px]" direction="column">
          <Flex align="center" className="relay-w-full">
            <Text style="subtitle3" className="relay-mr-auto">
              Total Price Impact{' '}
            </Text>
            <Text
              style="subtitle3"
              className="relay-mr-1 relay-ml-2"
              color={feeBreakdown?.totalFees?.priceImpactColor}
            >
              {feeBreakdown?.totalFees.priceImpact}
            </Text>
            <Text
              style="subtitle3"
              color={feeBreakdown?.totalFees?.priceImpactColor}
            >
              ({feeBreakdown?.totalFees.priceImpactPercentage})
            </Text>
          </Flex>
          <div
            className="relay-w-full relay-h-px relay-bg-[var(--relay-colors-slate-6)] relay-my-2"
          />
          <Flex align="center" className="relay-w-full">
            <Text style="subtitle3" color="subtle" className="relay-mr-auto">
              Swap Impact
            </Text>
            <Text
              style="subtitle3"
              color={getFeeColor(feeBreakdown?.totalFees?.swapImpact?.value)}
            >
              {feeBreakdown?.totalFees?.swapImpact?.formatted}
            </Text>
          </Flex>
          {feeBreakdown?.breakdown.map((fee) => {
            if (fee.id === 'origin-gas') {
              return null
            }
            return (
              <Flex key={fee.id} align="center" className="relay-w-full">
                <Text style="subtitle3" color="subtle" className="relay-mr-auto">
                  {fee.name}
                </Text>
                {feeBreakdown.isGasSponsored && fee.usd.value === 0 ? (
                  <Text style="subtitle3" color="success">
                    Free
                  </Text>
                ) : (
                  <Text style="subtitle3" color={getFeeColor(fee.usd.value)}>
                    {fee.usd.formatted}
                  </Text>
                )}
              </Flex>
            )
          })}

          {/* Learn More Link */}
          <Anchor
            href="https://docs.relay.link/references/api/api_core_concepts/fees#relay-fees"
            target="_blank"
            rel="noopener noreferrer"
            className="relay-text-[color:var(--relay-colors-primary11)] relay-text-[12px]"
          >
            Learn more about the fees
          </Anchor>
        </Flex>
      }
      {...tooltipProps}
    >
      {children}
    </Tooltip>
  )
}
