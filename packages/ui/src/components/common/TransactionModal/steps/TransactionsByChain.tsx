import { useMemo, type FC } from 'react'
import { useRelayClient } from '../../../../hooks/index.js'
import type { TxHashes } from '../TransactionModalRenderer.js'
import {
  Flex,
  Anchor,
  Text,
  Skeleton,
  Pill
} from '../../../primitives/index.js'
import { getTxBlockExplorerUrl } from '../../../../utils/getTxBlockExplorerUrl.js'
import { truncateAddress } from '../../../../utils/truncate.js'
import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import type { useRequests } from '@relayprotocol/relay-kit-hooks'

type TransactionsByChainProps = {
  allTxHashes: TxHashes
  fromChain?: RelayChain | null
  toChain?: RelayChain | null
  refundData?: NonNullable<
    ReturnType<typeof useRequests>['data']['0']['data']
  >['refundCurrencyData']
  isSolverStatusTimeout?: boolean
  fillTx?: { txHash: string; chainId: number } | null
}

export const TransactionsByChain: FC<TransactionsByChainProps> = ({
  allTxHashes,
  fromChain,
  toChain,
  refundData,
  isSolverStatusTimeout,
  fillTx
}) => {
  const relayClient = useRelayClient()
  const refundChain = refundData
    ? relayClient?.chains.find(
        (chain) => chain.id === refundData?.currency?.chainId
      )
    : null
  const txHashesByChain = useMemo(() => {
    return allTxHashes.reduce(
      (byChains, txHash) => {
        if (!byChains[txHash.chainId]) {
          byChains[txHash.chainId] = []
        }
        byChains[txHash.chainId].push(txHash)
        return byChains
      },
      {} as Record<number, TxHashes>
    )
  }, [allTxHashes, relayClient?.chains])

  const refundTx =
    allTxHashes.length > 0 ? allTxHashes[allTxHashes.length - 1] : null
  const isSameChain = fromChain?.id === toChain?.id

  const refundTxUrl =
    refundChain && refundData && refundTx
      ? getTxBlockExplorerUrl(
          refundChain?.id,
          relayClient?.chains,
          refundTx.txHash
        )
      : null

  // Build transaction rows for single container
  const transactions = []

  // 1. Send transaction (always first)
  const sendTxs = fromChain?.id
    ? txHashesByChain[fromChain.id]?.filter((tx) => !tx.isBatchTx)
    : []
  if (sendTxs && sendTxs.length > 0 && fromChain) {
    transactions.push({
      label: 'Send tx',
      txHashes: sendTxs,
      isRefund: false
    })
  }

  // 2. Receive transaction (refund or regular)
  if (refundData && refundChain) {
    // For refunds: find the correct refund tx on the destination chain
    const refundTxs =
      txHashesByChain[refundChain.id]?.filter((tx) => !tx.isBatchTx) || []
    // Use fillTx for the correct refund transaction hash if available
    const refundTxHash =
      fillTx?.txHash || refundTxs[0]?.txHash || refundTx?.txHash
    const refundTxUrl = refundTxHash
      ? getTxBlockExplorerUrl(refundChain.id, relayClient?.chains, refundTxHash)
      : null

    transactions.push({
      label: 'Receive tx',
      txHashes: [],
      isRefund: true,
      refundTxHash,
      refundTxUrl
    })
  } else if (toChain?.id && txHashesByChain[toChain.id] && !isSameChain) {
    // For regular swaps: show destination chain transaction
    const receiveTxs = txHashesByChain[toChain.id].filter((tx) => !tx.isBatchTx)
    if (receiveTxs.length > 0) {
      transactions.push({
        label: 'Receive tx',
        txHashes: receiveTxs,
        isRefund: false
      })
    }
  }

  // Return single container with all transactions
  return (
    <Flex direction="column" css={{ gap: '3' }}>
      {transactions.map((transaction, idx) => (
        <Flex justify="between" css={{ alignItems: 'center' }} key={idx}>
          <Flex css={{ alignItems: 'center', gap: '2' }}>
            <Text style="subtitle2" color="subtle">
              {transaction.label}
            </Text>
            {transaction.isRefund ? (
              <Pill
                color="gray"
                css={{
                  py: '1',
                  px: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <FontAwesomeIcon
                  icon={faRotateRight}
                  style={{ width: 16, height: 16, marginRight: 4 }}
                  color="#889096"
                />{' '}
                <Text style="subtitle3">Refunded</Text>
              </Pill>
            ) : null}
          </Flex>

          {/* Show regular transaction hashes */}
          {!transaction.isRefund && transaction.txHashes.length > 0 ? (
            <Flex direction="column">
              {transaction.txHashes.map(({ txHash, chainId, isBatchTx }) => {
                const txUrl = getTxBlockExplorerUrl(
                  chainId,
                  relayClient?.chains,
                  txHash
                )
                return txUrl && !isBatchTx ? (
                  <Anchor
                    key={txHash}
                    href={txUrl}
                    target="_blank"
                    data-testid="transaction-link"
                  >
                    {truncateAddress(txHash)}
                  </Anchor>
                ) : null
              })}
            </Flex>
          ) : null}

          {/* Show refund transaction hash */}
          {transaction.isRefund &&
          transaction.refundTxHash &&
          transaction.refundTxUrl ? (
            <Flex direction="column">
              <Anchor
                href={transaction.refundTxUrl}
                target="_blank"
                data-testid="refund-transaction-link"
              >
                {truncateAddress(transaction.refundTxHash)}
              </Anchor>
            </Flex>
          ) : null}

          {/* Show pending state */}
          {!transaction.isRefund &&
          transaction.txHashes.length === 0 &&
          !isSolverStatusTimeout ? (
            <Flex direction="column">
              <Text color="red" style="subtitle2">
                Order has not been filled
              </Text>
            </Flex>
          ) : null}

          {/* Show loading state */}
          {!transaction.isRefund &&
          transaction.txHashes.length === 0 &&
          isSolverStatusTimeout ? (
            <Flex direction="column">
              <Skeleton css={{ height: 20 }} />
            </Flex>
          ) : null}
        </Flex>
      ))}
    </Flex>
  )
}
