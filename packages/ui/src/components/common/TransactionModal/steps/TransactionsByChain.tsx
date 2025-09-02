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
import {
  faArrowUpRightFromSquare,
  faRotateRight
} from '@fortawesome/free-solid-svg-icons'
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
}

export const TransactionsByChain: FC<TransactionsByChainProps> = ({
  allTxHashes,
  fromChain,
  toChain,
  refundData,
  isSolverStatusTimeout
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

  return (isSameChain ? [fromChain] : [fromChain, toChain])
    .filter((chain) => {
      if (!chain?.id) return false
      const chainTxs = txHashesByChain[chain.id] || []
      // Only show chain if it has non-batch transactions
      return chainTxs.some((tx) => !tx.isBatchTx)
    })
    .map((chain, idx) => {
      const isRefundChain = refundData && refundChain?.id === chain?.id
      return (
        <Flex justify="between" key={idx}>
          <Flex css={{ alignItems: 'center', gap: '2' }}>
            <Text
              style="subtitle2"
              color="subtle"
              css={{ alignSelf: 'flex-start' }}
            >
              View {chain?.displayName} Tx
            </Text>
            {isRefundChain ? (
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
                <Text style="subtitle2">Refunded</Text>
              </Pill>
            ) : null}
          </Flex>
          {chain?.id && txHashesByChain[chain.id] && !isRefundChain ? (
            <Flex direction="column">
              {txHashesByChain[chain.id].map(
                ({ txHash, chainId, isBatchTx }) => {
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
                      css={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2'
                      }}
                      data-testid="transaction-link"
                    >
                      {truncateAddress(txHash)}
                      <FontAwesomeIcon
                        icon={faArrowUpRightFromSquare}
                        width={16}
                      />
                    </Anchor>
                  ) : null
                }
              )}
            </Flex>
          ) : null}
          {refundData && refundTxUrl && isRefundChain ? (
            <Flex direction="column">
              <Anchor
                key={refundTx?.txHash}
                href={refundTxUrl}
                target="_blank"
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2'
                }}
                data-testid="refund-transaction-link"
              >
                {truncateAddress(refundTx?.txHash)}
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} width={16} />
              </Anchor>
            </Flex>
          ) : null}
          {chain?.id &&
          !txHashesByChain[chain.id] &&
          !isSolverStatusTimeout &&
          !isRefundChain ? (
            <Flex direction="column">
              <Text color="red" style="subtitle2">
                Order has not been filled
              </Text>
            </Flex>
          ) : null}
          {chain?.id &&
          !txHashesByChain[chain.id] &&
          isSolverStatusTimeout &&
          !refundData &&
          !isRefundChain ? (
            <Flex direction="column">
              <Skeleton css={{ height: 20 }} />
            </Flex>
          ) : null}
        </Flex>
      )
    })
}
