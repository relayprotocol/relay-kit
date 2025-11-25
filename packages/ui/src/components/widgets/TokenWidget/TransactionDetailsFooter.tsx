import { type FC } from 'react'
import { Flex, Box, Text } from '../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faGasPump } from '@fortawesome/free-solid-svg-icons'
import type { QuoteResponse } from '@relayprotocol/relay-kit-hooks'
import type { FeeBreakdown } from '../../../types/FeeBreakdown.js'
import { formatDollar } from '../../../utils/numbers.js'

type TransactionDetailsFooterProps = {
  timeEstimate?: { time: number; formattedTime: string }
  feeBreakdown?: FeeBreakdown | null
  quote?: QuoteResponse
}

const TransactionDetailsFooter: FC<TransactionDetailsFooterProps> = ({
  timeEstimate,
  feeBreakdown,
  quote
}) => {
  const hasEstimate = timeEstimate !== undefined && (timeEstimate.time ?? 0) > 0
  const isLongEstimate = hasEstimate && (timeEstimate?.time ?? 0) >= 600
  const clockColor = hasEstimate
    ? isLongEstimate
      ? 'amber9'
      : 'green9'
    : 'gray9'

  const timeLabel = hasEstimate ? `~${timeEstimate?.formattedTime}` : '—'

  const originGas = feeBreakdown?.breakdown?.find(
    (fee) => fee.id === 'origin-gas'
  )
  const networkCostUsd =
    originGas?.usd.value ??
    (quote?.fees?.gas?.amountUsd !== undefined
      ? -Number(quote.fees.gas.amountUsd)
      : undefined)

  const networkCostLabel = formatDollar(
    networkCostUsd !== undefined ? Math.abs(networkCostUsd) : undefined
  )

  const hasNetworkCost =
    networkCostUsd !== undefined && networkCostLabel !== '-'
  const showDivider = timeEstimate && timeEstimate.time !== 0 && hasNetworkCost

  return (
    <Flex justify="center" align="center" css={{ gap: '6px', width: '100%' }}>
      {timeEstimate && timeEstimate.time !== 0 ? (
        <>
          <Flex align="center" css={{ gap: '2' }}>
            <Box
              css={{
                color: clockColor,
                width: 14,
                height: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FontAwesomeIcon icon={faClock} />
            </Box>
            <Text style="subtitle3" css={{ lineHeight: 'normal' }}>
              {timeLabel}
            </Text>
          </Flex>
          {showDivider ? (
            <Flex
              justify="center"
              align="center"
              css={{ color: 'gray6', height: 4 }}
            >
              &#8226;
            </Flex>
          ) : null}
        </>
      ) : null}
      {hasNetworkCost ? (
        <Flex align="center" css={{ gap: '2' }}>
          <Box
            css={{
              color: 'gray9',
              width: 14,
              height: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FontAwesomeIcon icon={faGasPump} />
          </Box>
          <Text style="subtitle3" css={{ lineHeight: 'normal' }}>
            {networkCostLabel}
          </Text>
        </Flex>
      ) : null}
    </Flex>
  )
}

export default TransactionDetailsFooter
