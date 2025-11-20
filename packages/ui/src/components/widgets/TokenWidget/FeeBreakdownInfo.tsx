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
      css={{
        gap: '1',
        minHeight: 42
      }}
    >
      <Flex align="center" css={{ gap: '1', minWidth: 0 }}>
        {isLoading ? (
          <Skeleton css={{ width: 90, height: 20 }} />
        ) : amountUsd && Number(amountUsd) > 0 ? (
          <>
            <Text
              style="h6"
              css={{
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0
              }}
            >
              {formatDollarCompact(Number(amountUsd))} total
            </Text>
            <FeeBreakdownTooltip
              quote={quote}
              feeBreakdown={feeBreakdown}
              fromToken={token}
              tooltipProps={{ side: 'top', align: 'end' }}
            >
              <Box
                css={{
                  color: 'gray8',
                  width: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <FontAwesomeIcon icon={faInfoCircle} />
              </Box>
            </FeeBreakdownTooltip>
          </>
        ) : token ? (
          <Text
            style="h6"
            css={{
              textAlign: 'right',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 'normal',
              minWidth: 0
            }}
          >
            $0 total
          </Text>
        ) : (
          <Text
            style="h6"
            css={{
              textAlign: 'right',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0
            }}
          >
            - total
          </Text>
        )}
      </Flex>
      {isLoading ? (
        <Skeleton css={{ width: 70, height: 14 }} />
      ) : amountUsd && Number(amountUsd) > 0 ? (
        token && tokenAmountFormatted && Number(tokenAmountFormatted) > 0 ? (
          <Text
            style="subtitle3"
            color="subtleSecondary"
            css={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              maxWidth: '100%'
            }}
          >
            {formatNumber(tokenAmountFormatted, 4, true)} {token.symbol}
          </Text>
        ) : token && fallbackTokenAmount && Number(fallbackTokenAmount) > 0 ? (
          <Text
            style="subtitle3"
            color="subtleSecondary"
            css={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              maxWidth: '100%'
            }}
          >
            {formatNumber(fallbackTokenAmount, 4, true)} {token.symbol}
          </Text>
        ) : null
      ) : token ? (
        <Text
          style="subtitle3"
          color="subtleSecondary"
          css={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            maxWidth: '100%'
          }}
        >
          0.00 {token.symbol}
        </Text>
      ) : null}
    </Flex>
  )
}
