import type { FC } from 'react'
import { Box, Flex, Text } from '../../primitives/index.js'
import Skeleton from '../../primitives/Skeleton.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { formatDollarCompact, formatNumber } from '../../../utils/numbers.js'
import { FeeBreakdownTooltip } from './FeeBreakdownTooltip.js'
import type { QuoteResponse } from '@relayprotocol/relay-kit-hooks'
import type { FeeBreakdown } from '../../../types/FeeBreakdown.js'
import type { Token } from '../../../types/index.js'

type FeeBreakdownInfoProps = {
  isLoading: boolean
  amountUsd?: string
  tokenAmountFormatted?: string
  fallbackTokenAmount?: string
  quote?: QuoteResponse
  feeBreakdown?: FeeBreakdown | null
  token?: Token
}

export const FeeBreakdownInfo: FC<FeeBreakdownInfoProps> = ({
  isLoading,
  amountUsd,
  tokenAmountFormatted,
  fallbackTokenAmount,
  quote,
  feeBreakdown,
  token
}) => {
  return (
    <Flex
      direction="column"
      align="end"
      justify={!token ? 'center' : 'start'}
      className="relay-gap-1 relay-min-h-[42px]"
    >
      <Flex align="center" className="relay-gap-1 relay-min-w-0">
        {isLoading ? (
          <Skeleton className="relay-w-[90px] relay-h-[20px]" />
        ) : amountUsd && Number(amountUsd) > 0 ? (
          <>
            <Text
              style="h6"
              className="relay-text-right relay-overflow-hidden relay-text-ellipsis relay-whitespace-nowrap relay-min-w-0"
            >
              {formatDollarCompact(Number(amountUsd))} total
            </Text>
            <FeeBreakdownTooltip
              quote={quote}
              feeBreakdown={feeBreakdown}
              fromToken={token}
              tooltipProps={{ side: 'top', align: 'end' }}
            >
              <Box className="relay-text-[color:var(--relay-colors-gray8)] relay-w-[16px] relay-flex relay-items-center relay-justify-center relay-cursor-pointer relay-shrink-0">
                <FontAwesomeIcon icon={faInfoCircle} />
              </Box>
            </FeeBreakdownTooltip>
          </>
        ) : token ? (
          <Text
            style="h6"
            className="relay-text-right relay-overflow-hidden relay-text-ellipsis relay-whitespace-nowrap relay-leading-normal relay-min-w-0"
          >
            $0 total
          </Text>
        ) : (
          <Text
            style="h6"
            className="relay-text-right relay-overflow-hidden relay-text-ellipsis relay-whitespace-nowrap relay-min-w-0"
          >
            - total
          </Text>
        )}
      </Flex>
      {isLoading ? (
        <Skeleton className="relay-w-[70px] relay-h-[14px]" />
      ) : amountUsd && Number(amountUsd) > 0 ? (
        token && tokenAmountFormatted && Number(tokenAmountFormatted) > 0 ? (
          <Text
            style="subtitle3"
            color="subtleSecondary"
            className="relay-overflow-hidden relay-text-ellipsis relay-whitespace-nowrap relay-min-w-0 relay-max-w-full"
          >
            {formatNumber(tokenAmountFormatted, 4, true)} {token.symbol}
          </Text>
        ) : token && fallbackTokenAmount && Number(fallbackTokenAmount) > 0 ? (
          <Text
            style="subtitle3"
            color="subtleSecondary"
            className="relay-overflow-hidden relay-text-ellipsis relay-whitespace-nowrap relay-min-w-0 relay-max-w-full"
          >
            {formatNumber(fallbackTokenAmount, 4, true)} {token.symbol}
          </Text>
        ) : null
      ) : token ? (
        <Text
          style="subtitle3"
          color="subtleSecondary"
          className="relay-overflow-hidden relay-text-ellipsis relay-whitespace-nowrap relay-min-w-0 relay-max-w-full"
        >
          0.00 {token.symbol}
        </Text>
      ) : null}
    </Flex>
  )
}
