import { type FC } from 'react'
import { Box, Button, Flex, Text } from '../../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons/faCircleExclamation'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight'
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
import Pill from '../../../primitives/Pill.js'
import { ChainTokenIcon } from '../../../primitives/ChainTokenIcon.js'
import type { Token } from '../../../../types/index.js'

type ErrorStepProps = {
  error?: Error | null
  address?: Address | string
  allTxHashes: TxHashes
  transaction?: ReturnType<typeof useRequests>['data']['0']
  fromChain?: RelayChain | null
  toChain?: RelayChain | null
  fromToken?: Token
  toToken?: Token
  fromAmountFormatted?: string
  toAmountFormatted?: string
  onOpenChange: (open: boolean) => void
}

export const ErrorStep: FC<ErrorStepProps> = ({
  error,
  address,
  allTxHashes,
  transaction,
  fromChain,
  toChain,
  fromToken,
  toToken,
  fromAmountFormatted,
  toAmountFormatted,
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
  let fillTx: { txHash: string; chainId: number } | undefined = undefined

  if (isRefund) {
    if (
      transaction &&
      transaction.status === 'refund' &&
      transaction.data?.outTxs &&
      transaction.data.outTxs.length > 0
    ) {
      fillTx = {
        txHash: transaction.data.outTxs[0].hash as Address,
        chainId: transaction.data.outTxs[0].chainId as number
      }
    }
  } else {
    fillTx =
      allTxHashes && allTxHashes.length > 1
        ? allTxHashes[allTxHashes.length - 1]
        : undefined
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
      className="relay-w-full"
    >
      <div className="relay-animate-content-fade-in">
        {isRefund ? (
          <Box className="relay-mr-2 relay-text-[color:var(--relay-colors-gray9)]">
            <FontAwesomeIcon icon={faRotateRight} className="relay-h-[40px]" />
          </Box>
        ) : null}

        {!isRefund && isSolverStatusTimeout ? (
          <Box className="relay-mr-2 relay-text-[color:var(--relay-colors-amber9)]">
            <FontAwesomeIcon
              icon={faCircleExclamation}
              className="relay-h-[40px]"
            />
          </Box>
        ) : null}

        {!isRefund && !isSolverStatusTimeout ? (
          <Box className="relay-mr-2 relay-text-[color:var(--relay-colors-red9)]">
            <FontAwesomeIcon icon={faCircleXmark} className="relay-h-[40px]" />
          </Box>
        ) : null}
      </div>

      {isRefund ? (
        transaction?.data?.failReason === 'UNKNOWN' ||
        !transaction?.data?.failReason ? (
          <Flex
            direction="column"
            className="relay-my-4 relay-text-center relay-items-center"
          >
            <Text style="subtitle1" className="relay-mb-4">
              It looks like an unknown issue occurred during the transaction.
              {fromToken && fromAmountFormatted && fromChain
                ? ` We've refunded ${fromAmountFormatted} ${fromToken.symbol} on ${fromChain.displayName}.`
                : ` We've refunded your tokens.`}
            </Text>

            {/* Transaction Pills */}
            <Flex className="relay-items-center relay-gap-2">
              {fromToken && fromChain ? (
                <Pill
                  color="gray"
                  className="relay-items-center relay-py-2 relay-px-3"
                >
                  <ChainTokenIcon
                    chainId={fromChain.id}
                    tokenlogoURI={fromToken.logoURI}
                    tokenSymbol={fromToken.symbol}
                    size="base"
                  />
                  <Text style="subtitle1" className="relay-ml-2">
                    {fromAmountFormatted} {fromToken.symbol}
                  </Text>
                </Pill>
              ) : (
                <Text style="subtitle1">?</Text>
              )}

              <Flex className="relay-items-center relay-justify-center relay-p-2">
                <FontAwesomeIcon className="relay-w-[14px]" icon={faArrowRight} />
              </Flex>

              {toToken && toChain ? (
                <Pill
                  color="gray"
                  className="relay-items-center relay-py-2 relay-px-3"
                >
                  <ChainTokenIcon
                    chainId={toChain.id}
                    tokenlogoURI={toToken.logoURI}
                    tokenSymbol={toToken.symbol}
                    size="base"
                  />
                  <Text style="subtitle1" className="relay-ml-2">
                    {toAmountFormatted} {toToken.symbol}
                  </Text>
                </Pill>
              ) : (
                <Text style="subtitle1">?</Text>
              )}
            </Flex>
          </Flex>
        ) : (
          <Text style="subtitle2" className="relay-my-4 relay-text-center">
            <RefundReason reasonCode={transaction?.data?.failReason} />
            {refundDetails
              ? ` We've refunded ${refundDetails.amountFormatted} ${refundDetails.currency?.symbol} on ${refundChain?.displayName}.`
              : ` We apologize for the inconvenience, a refund has been sent to your wallet address.`}
          </Text>
        )
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
            className="relay-p-3 relay-border relay-border-solid relay-border-[var(--relay-colors-subtle-border-color)] relay-gap-3 relay-w-full relay-rounded-[12px] relay-mb-6"
          >
            <TransactionsByChain
              allTxHashes={allTxHashes}
              fromChain={fromChain}
              toChain={toChain}
              isSolverStatusTimeout={isSolverStatusTimeout}
              refundData={refundDetails}
              fillTx={fillTx}
            />
          </Flex>

          <Flex className="relay-gap-3 relay-w-full">
            <Button
              color="secondary"
              cta={true}
              onClick={() => {
                window.open(
                  depositTx
                    ? `${baseTransactionUrl}/transaction/${depositTx.txHash}`
                    : `${baseTransactionUrl}/transactions?address=${address}`,
                  '_blank'
                )
              }}
              className="relay-justify-center relay-whitespace-nowrap"
            >
              View Details
            </Button>
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
        </>
      ) : (
        <Button
          cta={true}
          onClick={() => {
            onOpenChange(false)
          }}
          className="relay-justify-center relay-w-full"
        >
          Done
        </Button>
      )}
    </Flex>
  )
}
