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
    <Flex justify="center" align="center" className="relay-gap-[6px] relay-w-full">
      {timeEstimate && timeEstimate.time !== 0 ? (
        <>
          <Flex align="center" className="relay-gap-2">
            <Box
              className={`relay-w-[14px] relay-h-[14px] relay-flex relay-items-center relay-justify-center relay-text-[color:var(--relay-colors-${clockColor})]`}
            >
              <FontAwesomeIcon icon={faClock} />
            </Box>
            <Text style="subtitle3" className="relay-leading-normal">
              {timeLabel}
            </Text>
          </Flex>
          {showDivider ? (
            <Flex
              justify="center"
              align="center"
              className="relay-text-[color:var(--relay-colors-gray6)] relay-h-[4px]"
            >
              &#8226;
            </Flex>
          ) : null}
        </>
      ) : null}
      {hasNetworkCost ? (
        <Flex align="center" className="relay-gap-2">
          <Box className="relay-text-[color:var(--relay-colors-gray9)] relay-w-[14px] relay-h-[14px] relay-flex relay-items-center relay-justify-center">
            <FontAwesomeIcon icon={faGasPump} />
          </Box>
          <Text style="subtitle3" className="relay-leading-normal">
            {networkCostLabel}
          </Text>
        </Flex>
      ) : null}
    </Flex>
  )
}

export default TransactionDetailsFooter
