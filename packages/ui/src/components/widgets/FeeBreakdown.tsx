import { useState, type FC } from 'react'
import { Box, Button, Flex, Text } from '../primitives/index.js'
import type { ChildrenProps } from './SwapWidgetRenderer.js'
import { formatBN, formatDollar } from '../../utils/numbers.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGasPump } from '@fortawesome/free-solid-svg-icons/faGasPump'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown'
import FetchingQuoteLoader from '../widgets/FetchingQuoteLoader.js'
import SwapRouteSelector from '../widgets/SwapRouteSelector.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import {
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger
} from '../primitives/Collapsible.js'
import {
  faChevronRight,
  faClock,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons'
import { PriceImpactTooltip } from './PriceImpactTooltip.js'
import { getSlippageRating, ratingToColor } from '../../utils/slippage.js'
import Tooltip from '../primitives/Tooltip.js'
import React from 'react'

type Props = Pick<
  ChildrenProps,
  | 'feeBreakdown'
  | 'isFetchingQuote'
  | 'quote'
  | 'toToken'
  | 'fromToken'
  | 'timeEstimate'
  | 'supportsExternalLiquidity'
  | 'useExternalLiquidity'
  | 'setUseExternalLiquidity'
  | 'canonicalTimeEstimate'
> & {
  toChain?: RelayChain
  isSingleChainLocked?: boolean
  fromChainWalletVMSupported?: boolean
  isAutoSlippage: boolean
  slippageInputBps?: string
  error?: any
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
  supportsExternalLiquidity,
  useExternalLiquidity,
  setUseExternalLiquidity,
  timeEstimate,
  canonicalTimeEstimate,
  isSingleChainLocked,
  fromChainWalletVMSupported,
  isAutoSlippage,
  slippageInputBps,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const swapRate = quote?.details?.rate
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
  const quoteSlippage =
    (isSameChain
      ? destinationSlippageTolerance === '0'
        ? originSlippageTolerance
        : destinationSlippageTolerance
      : destinationSlippageTolerance) ?? '0'
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
          css={{
            gap: '1',
            color:
              timeEstimate && timeEstimate.time <= 30
                ? '{colors.grass.9}'
                : '{colors.amber.9}'
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
        <Flex align="center" css={{ gap: '1' }}>
          <FontAwesomeIcon
            icon={faGasPump}
            width={16}
            style={{ color: '#C1C8CD' }}
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
              <Flex align="center" css={{ gap: '1', color: 'gray8' }}>
                <Text
                  style="subtitle2"
                  css={{
                    color: isHighPriceImpact ? 'red11' : undefined
                  }}
                >
                  {feeBreakdown?.totalFees?.priceImpactPercentage}
                </Text>
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  width={14}
                  height={14}
                  style={{
                    display: 'inline-block',
                    marginLeft: 4
                  }}
                />
              </Flex>
            </div>
          }
        </PriceImpactTooltip>
      )
    },
    {
      title: 'Max Slippage',
      value: (
        <Flex align="center" css={{ gap: '1' }}>
          {isAutoSlippage ? (
            <Text
              style="subtitle3"
              css={{ py: '1px', px: '4px', bg: 'gray3', borderRadius: 100 }}
            >
              Auto
            </Text>
          ) : null}

          <Tooltip
            side="top"
            align="end"
            content={
              minimumAmountFormatted ? (
                <Flex direction="row" css={{ gap: '2' }}>
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
            <Text style="subtitle2" css={{ color: slippageRatingColor }}>
              {slippage}%
            </Text>
          </Tooltip>
        </Flex>
      )
    }
  ]

  if (!isSingleChainLocked && fromChainWalletVMSupported) {
    breakdown.unshift({
      title: 'Route',
      value: (
        <SwapRouteSelector
          chain={toChain}
          supportsExternalLiquidity={supportsExternalLiquidity}
          externalLiquidtySelected={useExternalLiquidity}
          onExternalLiquidityChange={(selected) => {
            setUseExternalLiquidity(selected)
          }}
          canonicalTimeEstimate={canonicalTimeEstimate?.formattedTime}
          error={error}
          trigger={
            <Button color="ghost" size="none">
              <Flex css={{ gap: '2', alignItems: 'center' }}>
                <Text style="subtitle2">
                  {useExternalLiquidity ? 'Native' : 'Relay'}
                </Text>
                {supportsExternalLiquidity || useExternalLiquidity ? (
                  <Box css={{ color: 'gray11', width: 14, flexShrink: 0 }}>
                    <FontAwesomeIcon icon={faChevronRight} width={14} />
                  </Box>
                ) : null}
              </Flex>
            </Button>
          }
        />
      )
    })
  }

  if (!feeBreakdown) {
    if (isFetchingQuote) {
      return (
        <Box
          id={'fee-breakdown-section'}
          css={{
            borderRadius: 'widget-card-border-radius',
            backgroundColor: 'widget-background',
            border: 'widget-card-border',
            overflow: 'hidden',
            mb: 'widget-card-section-gutter'
          }}
        >
          <FetchingQuoteLoader
            isLoading={isFetchingQuote}
            containerCss={{
              mt: 0,
              mb: 0,
              px: '4',
              py: '3',
              width: '100%',
              justifyContent: 'center'
            }}
          />
        </Box>
      )
    } else {
      return null
    }
  }

  return (
    <CollapsibleRoot
      open={isOpen}
      onOpenChange={setIsOpen}
      css={{ mb: 'widget-card-section-gutter' }}
    >
      <CollapsibleTrigger
        css={{
          borderRadius: 'widget-card-border-radius',
          borderBottomRadius: isOpen ? '0' : 'widget-card-border-radius',
          backgroundColor: 'widget-background',
          border: 'widget-card-border',
          borderBottom: isOpen ? 'none' : 'widget-card-border',
          overflow: 'hidden',
          transition: 'border-radius 300ms, border-bottom 0s',
          transitionDelay: isOpen ? '0s, 0s' : '0s, 300ms'
        }}
        id={'fee-breakdown-section'}
      >
        <Flex
          justify="between"
          align="center"
          css={{
            flexDirection: 'row',
            gap: '2',
            width: '100%',
            p: '3'
          }}
        >
          <span
            style={{
              cursor: 'pointer',
              flexShrink: 1,
              overflow: 'hidden',
              height: 21
            }}
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
            css={{
              gap: '2',
              color:
                timeEstimate && timeEstimate.time <= 30
                  ? '{colors.grass.9}'
                  : '{colors.amber.9}',
              flexShrink: 0
            }}
            align="center"
          >
            {!isOpen && timeEstimate && timeEstimate?.time !== 0 ? (
              <>
                <FontAwesomeIcon icon={faClock} width={16} />
                <Text style="subtitle2" css={{ flexShrink: 0 }}>
                  ~ {timeEstimate?.formattedTime}
                </Text>
                <Flex
                  justify="center"
                  align="center"
                  css={{ color: 'gray6', height: 4 }}
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
                  style={{ color: '#C1C8CD' }}
                />
                <Text style="subtitle2" css={{ flexShrink: 0 }}>
                  {originGasFeeFormatted}
                </Text>
              </>
            )}
            <Box
              css={{
                marginLeft: '2',
                transition: 'transform 300ms',
                transform: isOpen ? 'rotate(-180deg)' : 'rotate(0)',
                color: 'gray9'
              }}
            >
              <FontAwesomeIcon icon={faChevronDown} width={12} />
            </Box>
          </Flex>
        </Flex>
      </CollapsibleTrigger>
      <CollapsibleContent
        css={{
          borderRadius: '0 0 12px 12px',
          border: 'widget-card-border',
          borderTop: 'none'
        }}
      >
        <Flex
          direction="column"
          css={{
            px: '3',
            pb: '3',
            pt: '0',
            gap: '2',
            backgroundColor: 'widget-background'
          }}
        >
          {breakdown.map((item) => {
            const showNativeBridgeWarning =
              item.title === 'Estimated time' &&
              useExternalLiquidity &&
              timeEstimate?.time &&
              timeEstimate?.time > 86400
            return (
              <React.Fragment key={item.title}>
                <Flex
                  justify="between"
                  align="center"
                  css={{ width: '100%', gap: '4' }}
                >
                  <Text
                    style="subtitle2"
                    color={
                      showNativeBridgeWarning ? 'warningSecondary' : 'subtle'
                    }
                    css={{ alignSelf: 'flex-start' }}
                  >
                    {item.title}
                  </Text>
                  {item.value}
                </Flex>
                {showNativeBridgeWarning ? (
                  <Flex
                    align="center"
                    css={{
                      gap: '2',
                      py: '2',
                      px: '3',
                      backgroundColor: 'amber2',
                      borderRadius: 12
                    }}
                  >
                    <Text style="subtitle3" css={{ color: 'amber12' }}>
                      Native bridge routes are expected to take{' '}
                      {timeEstimate.formattedTime} but could be longer due to
                      unexpected delays
                    </Text>
                  </Flex>
                ) : null}
              </React.Fragment>
            )
          })}
        </Flex>
      </CollapsibleContent>
    </CollapsibleRoot>
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

  return (
    <Tooltip
      content={
        <Text style="subtitle2">
          1 {fromSymbol} = {formatSwapRate(displayRate)} {toSymbol}
        </Text>
      }
      asChild={true}
    >
      <div style={{ width: '100%', minWidth: 0 }}>
        <Text style="subtitle2" ellipsify>
          1 {fromSymbol} = {formatSwapRate(displayRate)} {toSymbol}
        </Text>
      </div>
    </Tooltip>
  )
}
