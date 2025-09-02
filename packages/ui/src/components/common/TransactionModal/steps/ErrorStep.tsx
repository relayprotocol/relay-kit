import { type FC } from 'react'
import { Box, Button, Flex, Text } from '../../../primitives/index.js'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons/faCircleExclamation'
import ErrorWell from '../../ErrorWell.js'
import { type Address } from 'viem'
import { type TxHashes } from '../TransactionModalRenderer.js'
import { useRelayClient } from '../../../../hooks/index.js'
import {
  faCircleXmark,
  faRotateRight
} from '@fortawesome/free-solid-svg-icons/index.js'
import type { useRequests } from '@relayprotocol/relay-kit-hooks'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import { getTxBlockExplorerUrl } from '../../../../utils/getTxBlockExplorerUrl.js'
import { JSONToError } from '../../../../utils/errors.js'
import { TransactionsByChain } from './TransactionsByChain.js'
import RefundReason from '../../../common/RefundReason.js'

type ErrorStepProps = {
  error?: Error | null
  address?: Address | string
  allTxHashes: TxHashes
  transaction?: ReturnType<typeof useRequests>['data']['0']
  fromChain?: RelayChain | null
  toChain?: RelayChain | null
  onOpenChange: (open: boolean) => void
}

export const ErrorStep: FC<ErrorStepProps> = ({
  error,
  address,
  allTxHashes,
  transaction,
  fromChain,
  toChain,
  onOpenChange
}) => {
  const parsedError = JSONToError(error)
  const errorMessage = transaction?.data?.failReason ?? parsedError?.message
  const isRefund =
    errorMessage?.toLowerCase()?.includes('refunded') ||
    transaction?.status === 'refund'
  const hasTxHashes = allTxHashes && allTxHashes.length > 0
  const isSolverStatusTimeout = parsedError?.message?.includes(
    'solver status check'
  )
  const relayClient = useRelayClient()
  const baseTransactionUrl = relayClient?.baseApiUrl.includes('testnets')
    ? 'https://testnets.relay.link'
    : 'https://relay.link'
  const depositTx = allTxHashes ? allTxHashes[0] : undefined
  const depositTxUrl = getTxBlockExplorerUrl(
    depositTx?.chainId,
    relayClient?.chains,
    depositTx?.txHash
  )
  let fillTx =
    allTxHashes && allTxHashes.length > 1
      ? allTxHashes[allTxHashes.length - 1]
      : undefined
  if (
    transaction &&
    transaction.status === 'refund' &&
    transaction.data?.outTxs
  ) {
    fillTx = {
      txHash: transaction.data.outTxs[0].hash as Address,
      chainId: transaction.data.outTxs[0].chainId as number
    }
  }
  const fillTxUrl = getTxBlockExplorerUrl(
    fillTx?.chainId,
    relayClient?.chains,
    fillTx?.txHash
  )

  const mergedError =
    isRefund && errorMessage ? new Error(errorMessage) : parsedError
  const refundDetails = transaction?.data?.refundCurrencyData
  const refundChain = transaction?.data?.refundCurrencyData?.currency?.chainId
    ? relayClient?.chains.find(
        (chain) =>
          chain.id === transaction.data?.refundCurrencyData?.currency?.chainId
      )
    : null

  return (
    <Flex
      direction="column"
      align="center"
      justify="between"
      css={{ width: '100%' }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20
        }}
      >
        {isRefund ? (
          <Box css={{ color: 'gray9', mr: '$2' }}>
            <FontAwesomeIcon icon={faRotateRight} style={{ height: 40 }} />
          </Box>
        ) : null}

        {!isRefund && isSolverStatusTimeout ? (
          <Box css={{ color: 'amber9', mr: '$2' }}>
            <FontAwesomeIcon
              icon={faCircleExclamation}
              style={{ height: 40 }}
            />
          </Box>
        ) : null}

        {!isRefund && !isSolverStatusTimeout ? (
          <Box css={{ color: 'red9', mr: '$2' }}>
            <FontAwesomeIcon icon={faCircleXmark} style={{ height: 40 }} />
          </Box>
        ) : null}
      </motion.div>

      {isRefund ? (
        <Text style="subtitle2" css={{ my: '4', textAlign: 'center' }}>
          <RefundReason reasonCode={transaction?.data?.failReason} />
          {refundDetails
            ? `We’ve
          refunded ${refundDetails.amountFormatted} ${refundDetails.currency?.symbol} on ${refundChain?.displayName}.`
            : `We apologize for the inconvenience, a refund has been sent to your wallet address.`}
        </Text>
      ) : (
        <ErrorWell
          error={mergedError}
          hasTxHashes={hasTxHashes}
          fromChain={fromChain}
        />
      )}
      {depositTx || fillTx ? (
        <>
          <Flex
            direction="column"
            css={{
              p: '3',
              '--borderColor': 'colors.subtle-border-color',
              border: '1px solid var(--borderColor)',
              gap: '3',
              width: '100%',
              borderRadius: 12,
              mb: 24
            }}
          >
            <TransactionsByChain
              allTxHashes={allTxHashes}
              fromChain={fromChain}
              toChain={toChain}
              isSolverStatusTimeout={isSolverStatusTimeout}
              refundData={refundDetails}
            />
          </Flex>

          <Flex css={{ gap: '3', width: '100%' }}>
            <Button
              color="secondary"
              onClick={() => {
                window.open(
                  depositTx
                    ? `${baseTransactionUrl}/transaction/${depositTx.txHash}`
                    : `${baseTransactionUrl}/transactions?address=${address}`,
                  '_blank'
                )
              }}
              css={{
                justifyContent: 'center',
                width: '100%'
              }}
            >
              View Details
            </Button>
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
        </>
      ) : (
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
      )}
    </Flex>
  )
}
