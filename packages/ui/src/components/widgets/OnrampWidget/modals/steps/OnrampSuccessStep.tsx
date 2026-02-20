import type { FC } from 'react'
import {
  Anchor,
  Box,
  Button,
  ChainTokenIcon,
  Flex,
  Pill,
  Skeleton,
  Text
} from '../../../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'
import { truncateAddress } from '../../../../../utils/truncate.js'
import type { Token } from '../../../../../types/index.js'

type OnrampSuccessStepProps = {
  toToken: Token
  moonpayTxUrl?: string
  fillTxUrl?: string
  fillTxHash?: string
  isLoadingTransaction?: boolean
  toAmountFormatted?: string
  baseTransactionUrl?: string
  onOpenChange: (open: boolean) => void
}

export const OnrampSuccessStep: FC<OnrampSuccessStepProps> = ({
  toToken,
  moonpayTxUrl,
  isLoadingTransaction,
  toAmountFormatted,
  fillTxHash,
  fillTxUrl,
  baseTransactionUrl,
  onOpenChange
}) => {
  return (
    <Flex
      direction="column"
      className="relay-w-full relay-h-full"
    >
      <Text style="h6" className="relay-mb-4">
        Transaction Details
      </Text>
      <Flex direction="column" align="center" justify="between">
        <div className="relay-animate-content-fade-in">
          <Flex
            align="center"
            justify="center"
            className="relay-relative relay-rounded-full relay-h-[80px] relay-w-[80px] relay-bg-[var(--relay-colors-green2)] relay-border-[6px] relay-border-solid relay-border-[var(--relay-colors-green10)]"
          >
            <Box className="relay-text-[color:var(--relay-colors-green9)] relay-mr-[8px]">
              <FontAwesomeIcon icon={faCheck} className="relay-h-[40px]" />
            </Box>
          </Flex>
        </div>

        <Text style="subtitle1" className="relay-mt-4 relay-text-center">
          Successfully purchased
        </Text>
        <Pill
          color="gray"
          className="relay-items-center relay-my-4 relay-py-2 relay-px-3 relay-gap-2"
        >
          <ChainTokenIcon
            chainId={toToken.chainId}
            tokenlogoURI={toToken.logoURI}
            tokenSymbol={toToken.symbol}
            className="relay-h-[32px] relay-w-[32px]"
          />
          {isLoadingTransaction ? (
            <Skeleton className="relay-h-[24px] relay-w-[60px] relay-bg-[var(--relay-colors-gray5)]" />
          ) : (
            <Text style="subtitle1" ellipsify>
              {toAmountFormatted} {toToken.symbol}
            </Text>
          )}
        </Pill>
        <Flex direction="column" className="relay-gap-2" align="center">
          <Anchor
            href={moonpayTxUrl}
            target="_blank"
            className="relay-flex relay-items-center relay-gap-1"
          >
            View MoonPay transaction{' '}
            <FontAwesomeIcon icon={faUpRightFromSquare} className="relay-w-[14px]" />
          </Anchor>
          {fillTxUrl ? (
            <Anchor href={fillTxUrl} target="_blank">
              View Tx: {truncateAddress(fillTxHash)}
            </Anchor>
          ) : null}
        </Flex>
      </Flex>
      <Flex className="relay-w-full relay-mt-[24px] relay-gap-3">
        {fillTxHash ? (
          <a
            href={`${baseTransactionUrl}/transaction/${fillTxHash}`}
            className="relay-w-full"
            target="_blank"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <Button
              cta={true}
              color="secondary"
              className="relay-justify-center relay-w-max"
            >
              View Details
            </Button>
          </a>
        ) : null}
        <Button
          cta={true}
          onClick={() => {
            onOpenChange(false)
          }}
          className="relay-justify-center relay-w-full"
        >
          Done
        </Button>
      </Flex>
    </Flex>
  )
}
