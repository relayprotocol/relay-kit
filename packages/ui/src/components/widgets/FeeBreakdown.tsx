import { useState, type FC } from 'react'
import { Box, Button, Flex, Text } from '../primitives/index.js'
import type { ChildrenProps } from './SwapWidgetRenderer.js'
import { formatBN, formatDollar } from '../../utils/numbers.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGasPump } from '@fortawesome/free-solid-svg-icons/faGasPump'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown'
import FetchingQuoteLoader from '../widgets/FetchingQuoteLoader.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import {
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger
} from '../primitives/Collapsible.js'
import { faClock, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { PriceImpactTooltip } from './PriceImpactTooltip.js'
import { getSlippageRating, ratingToColor } from '../../utils/slippage.js'
import Tooltip from '../primitives/Tooltip.js'
import React from 'react'
import { cn } from '../../utils/cn.js'

type Props = Pick<
  ChildrenProps,
  | 'feeBreakdown'
  | 'isFetchingQuote'
  | 'quote'
  | 'toToken'
  | 'fromToken'
  | 'timeEstimate'
> & {
  toChain?: RelayChain
  isSingleChainLocked?: boolean
  fromChainWalletVMSupported?: boolean
  isAutoSlippage: boolean
  slippageInputBps?: string
  error?: any
  onOpenSlippageConfig?: () => void
}

const formatSwapRate = (rate: number) => {
  return rate >= 1 ? formatBN(rate, 2, 18, false) : formatBN(rate, 4, 18, false)
}

const FeeBreakdown: FC<Props> = ({
  feeBreakdown,
  isFetchingQuote,
  quote,
  toToken,
  fromToken,
  toChain,
  timeEstimate,
  isSingleChainLocked,
  fromChainWalletVMSupported,
  isAutoSlippage,
  slippageInputBps,
  error,
  onOpenSlippageConfig
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const swapRate = quote?.details?.rate
  const isFixedRate = quote?.details?.isFixedRate
  const originGasFee = feeBreakdown?.breakdown?.find(
    (fee) => fee.id === 'origin-gas'
  )
  const originGasFeeFormatted = formatDollar(
    Math.abs(originGasFee?.usd.value ?? 0)
  )

  const [rateMode, setRateMode] = useState<'input' | 'output'>('input')
  const isHighPriceImpact = Number(quote?.details?.totalImpact?.percent) < -3.5

  const isSameChain = toToken?.chainId === fromToken?.chainId
  const originSlippageTolerance =
    quote?.details?.slippageTolerance?.origin?.percent
  const destinationSlippageTolerance =
    quote?.details?.slippageTolerance?.destination?.percent
  const quoteSlippage = isFixedRate
    ? '0'
    : ((isSameChain
        ? destinationSlippageTolerance === '0'
          ? originSlippageTolerance
          : destinationSlippageTolerance
        : destinationSlippageTolerance) ?? '0')
  const slippageInputNumber = Number(
    (Number(slippageInputBps ?? '0') / 100).toFixed(2)
  )
  const slippage = `${Math.max(Number(quoteSlippage), slippageInputNumber)}`

  const slippageRating = getSlippageRating(slippage)
  const slippageRatingColor = ratingToColor[slippageRating]
  const minimumAmountFormatted = quote?.details?.currencyOut?.minimumAmount
    ? formatBN(
        quote.details.currencyOut.minimumAmount,
        6,
        toToken?.decimals,
        false
      )
    : undefined

  const breakdown = [
    {
      title: 'Estimated time',
      value: (
        <Flex
          align="center"
          className="relay-gap-1"
          style={{
            color:
              timeEstimate && timeEstimate.time <= 30
                ? 'var(--relay-colors-grass-9)'
                : 'var(--relay-colors-amber-9)'
          }}
        >
          <FontAwesomeIcon icon={faClock} width={16} />
          <Text style="subtitle2">~ {timeEstimate?.formattedTime}</Text>
        </Flex>
      )
    },
    {
      title: 'Network cost',
      value: (
        <Flex align="center" className="relay-gap-1">
          <FontAwesomeIcon
            icon={faGasPump}
            width={16}
            className="relay-text-[#C1C8CD]"
          />
          <Text style="subtitle2">{originGasFeeFormatted}</Text>
        </Flex>
      )
    },
    {
      title: 'Price Impact',
      value: (
        <PriceImpactTooltip
          feeBreakdown={feeBreakdown}
          tooltipProps={{ side: 'top', align: 'end' }}
        >
          {
            <div>
              <Flex
                align="center"
                className="relay-gap-1 relay-text-[color:var(--relay-colors-gray8)]"
              >
                <Text
                  style="subtitle2"
                  className={cn(
                    isHighPriceImpact &&
                      'relay-text-[color:var(--relay-colors-red11)]'
                  )}
                >
                  {feeBreakdown?.totalFees?.priceImpactPercentage}
                </Text>
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  width={14}
                  height={14}
                  className="relay-inline-block relay-ml-[4px]"
                />
              </Flex>
            </div>
          }
        </PriceImpactTooltip>
      )
    }
  ]

  if (!feeBreakdown) {
    if (isFetchingQuote) {
      return (
        <Box
          id={'fee-breakdown-section'}
          className="relay-rounded-[var(--relay-radii-widget-card-border-radius)] relay-bg-[var(--relay-colors-widget-background)] relay-border-widget-card relay-overflow-hidden relay-mb-[var(--relay-spacing-widget-card-section-gutter)]"
        >
          <div className="relay-mt-0 relay-mb-0 relay-px-4 relay-py-3 relay-w-full relay-flex relay-justify-center">
            <FetchingQuoteLoader isLoading={isFetchingQuote} />
          </div>
        </Box>
      )
    } else {
      return null
    }
  }

  return (
    <Flex
      className={cn(
        'relay-rounded-[var(--relay-radii-widget-card-border-radius)] relay-bg-[var(--relay-colors-widget-background)] relay-overflow-hidden relay-mb-[var(--relay-spacing-widget-card-section-gutter)]',
        'relay-border-widget-card relay-transition-[border-radius,border-bottom]',
        isOpen && 'relay-rounded-b-none'
      )}
      style={{
        borderBottom: isOpen ? 'none' : undefined,
        transitionDuration: '300ms, 0s',
        transitionDelay: isOpen ? '0s, 0s' : '0s, 300ms'
      }}
      direction="column"
    >
      <Flex justify="between" align="center" className="relay-p-3 relay-pb-0">
        <Text style="subtitle2">Max Slippage</Text>
        <Flex align="center" className="relay-gap-2">
          {isAutoSlippage ? (
            <Button
              aria-label="Auto"
              className="relay-text-[12px] relay-font-medium relay-px-1 relay-py-1 relay-min-h-[23px] relay-leading-[100%] relay-bg-[var(--relay-colors-widget-selector-background)] relay-border-none hover:relay-bg-[var(--relay-colors-widget-selector-hover-background)]"
              color="white"
              size="none"
              onClick={(e) => {
                e.preventDefault()
                onOpenSlippageConfig?.()
              }}
            >
              Auto
            </Button>
          ) : null}
          <Tooltip
            side="top"
            align="end"
            content={
              minimumAmountFormatted ? (
                <Flex direction="row" className="relay-gap-2">
                  <Text style="subtitle2" color="subtle">
                    Min. received
                  </Text>
                  <Text style="subtitle2">
                    {minimumAmountFormatted} {toToken?.symbol}
                  </Text>
                </Flex>
              ) : null
            }
          >
            <Text style="subtitle2">
              <span
                style={{
                  color: slippageRatingColor
                    ? `var(--relay-colors-${slippageRatingColor})`
                    : undefined
                }}
              >
                {slippage}%
              </span>
            </Text>
          </Tooltip>
        </Flex>
      </Flex>
      <CollapsibleRoot open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger id={'fee-breakdown-section'}>
          <Flex
            justify="between"
            align="center"
            className="relay-flex-row relay-gap-2 relay-w-full relay-p-3"
          >
            <span
              className="relay-cursor-pointer relay-shrink relay-overflow-hidden relay-h-[21px]"
              onClick={(e) => {
                setRateMode(rateMode === 'input' ? 'output' : 'input')
                e.preventDefault()
              }}
            >
              <ConversionRate
                fromToken={fromToken}
                toToken={toToken}
                rate={Number(swapRate)}
                isInputMode={rateMode === 'input'}
              />
            </span>

            <Flex
              className="relay-gap-2 relay-shrink-0"
              style={{
                color:
                  timeEstimate && timeEstimate.time <= 30
                    ? 'var(--relay-colors-grass-9)'
                    : 'var(--relay-colors-amber-9)'
              }}
              align="center"
            >
              {!isOpen && timeEstimate && timeEstimate?.time !== 0 ? (
                <>
                  <FontAwesomeIcon icon={faClock} width={16} />
                  <Text style="subtitle2" className="relay-shrink-0">
                    ~ {timeEstimate?.formattedTime}
                  </Text>
                  <Flex
                    justify="center"
                    align="center"
                    className="relay-text-[color:var(--relay-colors-gray6)] relay-h-[4px]"
                  >
                    &#8226;
                  </Flex>
                </>
              ) : null}
              {!isOpen && (
                <>
                  <FontAwesomeIcon
                    icon={faGasPump}
                    width={16}
                    className="relay-text-[#C1C8CD]"
                  />
                  <Text style="subtitle2" className="relay-shrink-0">
                    {originGasFeeFormatted}
                  </Text>
                </>
              )}
              <div
                className="relay-ml-2 relay-transition-transform relay-duration-300 relay-text-[color:var(--relay-colors-gray9)]"
                style={{
                  transform: isOpen ? 'rotate(-180deg)' : 'rotate(0)'
                }}
              >
                <FontAwesomeIcon icon={faChevronDown} width={12} />
              </div>
            </Flex>
          </Flex>
        </CollapsibleTrigger>
        <CollapsibleContent className="relay-rounded-b-[12px]">
          <Flex
            direction="column"
            className="relay-px-3 relay-pb-3 relay-pt-0 relay-gap-2 relay-bg-[var(--relay-colors-widget-background)]"
          >
            {breakdown.map((item) => {
              return (
                <React.Fragment key={item.title}>
                  <Flex
                    justify="between"
                    align="center"
                    className="relay-w-full relay-gap-4"
                  >
                    <Text
                      style="subtitle2"
                      color={'subtle'}
                      className="relay-self-start"
                    >
                      {item.title}
                    </Text>
                    {item.value}
                  </Flex>
                </React.Fragment>
              )
            })}
          </Flex>
        </CollapsibleContent>
      </CollapsibleRoot>
    </Flex>
  )
}

export default FeeBreakdown

type ConversionRateProps = {
  fromToken?: { symbol: string }
  toToken?: { symbol: string }
  rate: number
  isInputMode: boolean
}

const ConversionRate: FC<ConversionRateProps> = ({
  fromToken,
  toToken,
  rate,
  isInputMode
}) => {
  const displayRate = isInputMode ? rate : 1 / rate
  const fromSymbol = isInputMode ? fromToken?.symbol : toToken?.symbol
  const toSymbol = isInputMode ? toToken?.symbol : fromToken?.symbol

  const rateText = `1 ${fromSymbol} = ${formatSwapRate(displayRate)} ${toSymbol}`
  const shouldShowTooltip = rateText.length > 22

  const content = (
    <div className="relay-w-full relay-min-w-0">
      <Text style="subtitle2" ellipsify>
        {rateText}
      </Text>
    </div>
  )

  if (shouldShowTooltip) {
    return (
      <Tooltip
        content={<Text style="subtitle2">{rateText}</Text>}
        asChild={true}
      >
        {content}
      </Tooltip>
    )
  }

  return content
}
