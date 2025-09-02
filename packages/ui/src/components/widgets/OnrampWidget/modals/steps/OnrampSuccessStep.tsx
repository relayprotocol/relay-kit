import type { FC } from 'react'
import { motion } from 'framer-motion'
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
      css={{
        width: '100%',
        height: '100%'
      }}
    >
      <Text style="h6" css={{ mb: '4' }}>
        Transaction Details
      </Text>
      <Flex direction="column" align="center" justify="between">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20
          }}
        >
          <Flex
            align="center"
            justify="center"
            css={{
              height: 80,
              width: 80,
              backgroundColor: 'green2',
              '--borderColor': 'colors.green10',
              border: '6px solid var(--borderColor)',
              borderRadius: '999999px',
              position: 'relative'
            }}
          >
            <Box css={{ color: 'green9', mr: '$2' }}>
              <FontAwesomeIcon icon={faCheck} style={{ height: 40 }} />
            </Box>
          </Flex>
        </motion.div>

        <Text style="subtitle1" css={{ mt: '4', textAlign: 'center' }}>
          Successfully purchased
        </Text>
        <Pill
          color="gray"
          css={{ alignItems: 'center', my: '4', py: '2', px: '3', gap: '2' }}
        >
          <ChainTokenIcon
            chainId={toToken.chainId}
            tokenlogoURI={toToken.logoURI}
            tokenSymbol={toToken.symbol}
            css={{ height: 32, width: 32 }}
          />
          {isLoadingTransaction ? (
            <Skeleton css={{ height: 24, width: 60, background: 'gray5' }} />
          ) : (
            <Text style="subtitle1" ellipsify>
              {toAmountFormatted} {toToken.symbol}
            </Text>
          )}
        </Pill>
        <Flex direction="column" css={{ gap: '2' }} align="center">
          <Anchor
            href={moonpayTxUrl}
            target="_blank"
            css={{ display: 'flex', alignItems: 'center', gap: '1' }}
          >
            View MoonPay transaction{' '}
            <FontAwesomeIcon icon={faUpRightFromSquare} style={{ width: 14 }} />
          </Anchor>
          {fillTxUrl ? (
            <Anchor href={fillTxUrl} target="_blank">
              View Tx: {truncateAddress(fillTxHash)}
            </Anchor>
          ) : null}
        </Flex>
      </Flex>
      <Flex css={{ width: '100%', mt: '24px', gap: '3' }}>
        {fillTxHash ? (
          <a
            href={`${baseTransactionUrl}/transaction/${fillTxHash}`}
            style={{ width: '100%' }}
            target="_blank"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <Button
              cta={true}
              color="secondary"
              css={{
                justifyContent: 'center',
                width: 'max-content'
              }}
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
          css={{
            justifyContent: 'center',
            width: '100%'
          }}
        >
          Done
        </Button>
      </Flex>
    </Flex>
  )
}
