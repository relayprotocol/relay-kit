import { useContext, type FC } from 'react'
import {
  Box,
  Button,
  Flex,
  Pill,
  Text,
  ChainTokenIcon,
  Skeleton,
  Anchor
} from '../../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type TxHashes } from '../TransactionModalRenderer.js'
import { type Token } from '../../../../types/index.js'
import type { useRequests } from '@relayprotocol/relay-kit-hooks'
import { useRelayClient } from '../../../../hooks/index.js'
import { faClockFour } from '@fortawesome/free-solid-svg-icons/faClockFour'
import {
  ASSETS_RELAY_API,
  type Execute,
  type ExecuteStepItem
} from '@relayprotocol/relay-sdk'
import { bitcoin } from '../../../../utils/bitcoin.js'
import { formatSignificantDigits } from '../../../../utils/numbers.js'
import { TransactionsByChain } from './TransactionsByChain.js'
import { faArrowRight, faCheck } from '@fortawesome/free-solid-svg-icons'
import { RelayIcon, XIcon } from '../../../../icons/index.js'
import { ProviderOptionsContext } from '../../../../providers/RelayKitProvider.js'
import { getTxBlockExplorerUrl } from '../../../../utils/getTxBlockExplorerUrl.js'
import { truncateAddress } from '../../../../utils/truncate.js'

type SwapSuccessStepProps = {
  fromToken?: Token
  toToken?: Token
  fromAmountFormatted?: string
  toAmountFormatted?: string
  allTxHashes: TxHashes
  transaction?: ReturnType<typeof useRequests>['data']['0']
  seconds: number
  fillTime: string
  timeEstimate?: string
  details?: Execute['details'] | null
  isLoadingTransaction?: boolean
  onOpenChange: (open: boolean) => void
  requestId: string | null
  isGasSponsored?: boolean
  currentCheckStatus?: ExecuteStepItem['checkStatus']
}

export const SwapSuccessStep: FC<SwapSuccessStepProps> = ({
  fromToken,
  toToken,
  fromAmountFormatted,
  toAmountFormatted,
  allTxHashes,
  transaction,
  fillTime,
  seconds,
  timeEstimate,
  details,
  isLoadingTransaction,
  onOpenChange,
  requestId,
  isGasSponsored,
  currentCheckStatus
}) => {
  const relayClient = useRelayClient()
  const isWrap = details?.operation === 'wrap'
  const isUnwrap = details?.operation === 'unwrap'
  const providerOptionsContext = useContext(ProviderOptionsContext)

  // Get chains data for explorer URL generation
  const chains = relayClient?.chains

  const _fromAmountFormatted = transaction?.data?.metadata?.currencyIn?.amount
    ? formatSignificantDigits(
        transaction?.data?.metadata?.currencyIn?.amount,
        transaction?.data?.metadata?.currencyIn?.currency?.decimals ?? 18
      )
    : fromAmountFormatted
  const _fromToken =
    transaction?.data?.metadata?.currencyIn?.currency ?? fromToken
  const fromTokenLogoUri =
    transaction?.data?.metadata?.currencyIn?.currency?.metadata?.logoURI ??
    fromToken?.logoURI
  const _toAmountFormatted = transaction?.data?.metadata?.currencyOut?.amount
    ? formatSignificantDigits(
        transaction?.data?.metadata?.currencyOut?.amount,
        transaction?.data?.metadata?.currencyOut?.currency?.decimals ?? 18
      )
    : toAmountFormatted
  const _toToken = transaction?.data?.metadata?.currencyOut?.currency ?? toToken
  const toTokenLogoUri =
    transaction?.data?.metadata?.currencyOut?.currency?.metadata?.logoURI ??
    toToken?.logoURI

  const baseTransactionUrl = relayClient?.baseApiUrl.includes('testnets')
    ? 'https://testnets.relay.link'
    : 'https://relay.link'
  const fromChain = _fromToken
    ? relayClient?.chains.find((chain) => chain.id === _fromToken?.chainId)
    : null
  const toChain = _toToken
    ? relayClient?.chains.find((chain) => chain.id === _toToken?.chainId)
    : null

  const isSameChainSwap = fromChain?.id === toChain?.id && !isWrap && !isUnwrap
  const delayedTxUrl = requestId
    ? `${baseTransactionUrl}/transaction/${requestId}`
    : null
  const timeEstimateMs = (details?.timeEstimate ?? 0) * 1000

  const isBitcoinOrigin = fromChain?.id === bitcoin.id
  const isBitcoinDestination = toChain?.id === bitcoin.id

  const isRefund =
    transaction?.status === 'refund' || transaction?.data?.refundCurrencyData

  // Show delayed screen when:
  // 1. Bitcoin as origin: Immediately (no status check needed, tx takes 10+ mins)
  // 2. Bitcoin as destination: When status reaches 'submitted'

  const isDelayedTx =
    isBitcoinOrigin ||
    (isBitcoinDestination &&
      (currentCheckStatus === 'submitted' || currentCheckStatus === 'success'))

  // Bitcoin transactions typically take 10+ minutes for confirmation
  const estimatedMinutes =
    isBitcoinOrigin || isBitcoinDestination
      ? 10
      : Math.round(timeEstimateMs / 1000 / 60)

  const gasTopUpAmountCurrency =
    transaction?.data?.metadata?.currencyGasTopup?.currency
  const formattedGasTopUpAmount = transaction?.data?.metadata?.currencyGasTopup
    ?.amount
    ? formatSignificantDigits(
        BigInt(transaction?.data?.metadata?.currencyGasTopup?.amount),
        gasTopUpAmountCurrency?.decimals ?? 18
      )
    : undefined

  // Helper function to get transaction hash for a specific chain
  const getTxHashForChain = (chainId: number, skipRefundCheck = false) => {
    if (isRefund && !skipRefundCheck) {
      const refundTxHash = transaction?.data?.outTxs?.[0]?.hash
      const refundChainId = transaction?.data?.outTxs?.[0]?.chainId
      if (refundChainId === chainId && refundTxHash) {
        return refundTxHash
      }
      if (transaction?.data?.refundCurrencyData && !refundTxHash) {
        return undefined
      }
    }
    return allTxHashes.find((tx) => tx.chainId === chainId)?.txHash
  }

  // Helper function to get transaction URL for a specific chain and hash
  const getTxUrl = (chainId: number, txHash: string) => {
    return getTxBlockExplorerUrl(chainId, chains, txHash)
  }

  const shareIconFill =
    providerOptionsContext.themeScheme === 'dark' ? '#fff' : '#000'

  return isDelayedTx ? (
    <>
      <Flex direction="column" align="center" justify="between">
        <div className="relay-animate-content-fade-in">
          <Flex
            align="center"
            justify="center"
            className="relay-relative relay-rounded-full relay-h-[80px] relay-w-[78px] relay-bg-[var(--relay-colors-amber2)]"
          >
            <svg
              className="relay-absolute relay-top-[7px] relay-left-0 relay-z-0"
              width="76"
              height="80"
              viewBox="0 0 64 54"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <mask id="path-1-inside-1_1551_3458" fill="white">
                <path d="M60.5983 22C62.477 22 64.0187 23.5272 63.8194 25.3953C63.3839 29.4763 62.1661 33.4465 60.2215 37.0847C57.7408 41.7257 54.1538 45.6834 49.7782 48.607C45.4027 51.5307 40.3736 53.3301 35.1366 53.8459C29.8995 54.3617 24.616 53.578 19.7541 51.5641C14.8923 49.5503 10.6021 46.3685 7.26367 42.3006C3.92522 38.2327 1.64152 33.4042 0.614871 28.2429C-0.411778 23.0816 -0.149694 17.7467 1.37791 12.7109C2.57543 8.7632 4.52167 5.09478 7.09947 1.90114C8.27945 0.439263 10.4495 0.449489 11.7779 1.77792C13.1063 3.10635 13.0848 5.24829 11.9473 6.74343C10.1382 9.12126 8.76082 11.8094 7.88827 14.6858C6.68544 18.651 6.47907 22.8516 7.28745 26.9156C8.09583 30.9796 9.89401 34.7816 12.5227 37.9846C15.1514 41.1877 18.5294 43.693 22.3576 45.2787C26.1859 46.8644 30.346 47.4815 34.4697 47.0754C38.5934 46.6692 42.5532 45.2524 45.9985 42.9503C49.4438 40.6482 52.2682 37.532 54.2215 33.8776C55.6384 31.2267 56.5653 28.352 56.9674 25.3914C57.2203 23.5298 58.7197 22 60.5983 22Z" />
              </mask>
              <path
                d="M60.5983 22C62.477 22 64.0187 23.5272 63.8194 25.3953C63.3839 29.4763 62.1661 33.4465 60.2215 37.0847C57.7408 41.7257 54.1538 45.6834 49.7782 48.607C45.4027 51.5307 40.3736 53.3301 35.1366 53.8459C29.8995 54.3617 24.616 53.578 19.7541 51.5641C14.8923 49.5503 10.6021 46.3685 7.26367 42.3006C3.92522 38.2327 1.64152 33.4042 0.614871 28.2429C-0.411778 23.0816 -0.149694 17.7467 1.37791 12.7109C2.57543 8.7632 4.52167 5.09478 7.09947 1.90114C8.27945 0.439263 10.4495 0.449489 11.7779 1.77792C13.1063 3.10635 13.0848 5.24829 11.9473 6.74343C10.1382 9.12126 8.76082 11.8094 7.88827 14.6858C6.68544 18.651 6.47907 22.8516 7.28745 26.9156C8.09583 30.9796 9.89401 34.7816 12.5227 37.9846C15.1514 41.1877 18.5294 43.693 22.3576 45.2787C26.1859 46.8644 30.346 47.4815 34.4697 47.0754C38.5934 46.6692 42.5532 45.2524 45.9985 42.9503C49.4438 40.6482 52.2682 37.532 54.2215 33.8776C55.6384 31.2267 56.5653 28.352 56.9674 25.3914C57.2203 23.5298 58.7197 22 60.5983 22Z"
                stroke="#FFB224"
                strokeWidth="8"
                strokeLinejoin="round"
                mask="url(#path-1-inside-1_1551_3458)"
              />
            </svg>

            <Box
              className="relay-z-[1] relay-text-[color:var(--relay-colors-amber9)] relay-mr-2"
            >
              <FontAwesomeIcon icon={faClockFour} className="relay-h-[32px]" />
            </Box>
          </Flex>
        </div>

        <Text
          style="subtitle1"
          className="relay-my-4 relay-text-center"
        >
          {isBitcoinOrigin || isBitcoinDestination
            ? `Bitcoin confirmation takes ${estimatedMinutes} minutes. Track progress on the transaction page.`
            : `Processing bridge, this will take ~${estimatedMinutes} ${estimatedMinutes === 1 ? 'min' : 'mins'}.`}
        </Text>

        <Flex align="center" className="relay-gap-2 relay-mb-[24px]">
          {fromChain ? (
            <Pill color="gray" className="relay-items-center relay-py-2 relay-px-3">
              <ChainTokenIcon
                chainId={fromChain.id}
                tokenlogoURI={fromTokenLogoUri}
                tokenSymbol={_fromToken?.symbol}
                size="sm"
                chainRadius={2.5}
              />
              <Text style="subtitle1" className="relay-ml-2">
                {_fromAmountFormatted} {_fromToken?.symbol}
              </Text>
            </Pill>
          ) : (
            <Text style="subtitle1">?</Text>
          )}
          <Flex className="relay-items-center relay-justify-center relay-p-2">
            <FontAwesomeIcon className="relay-w-[14px]" icon={faArrowRight} />
          </Flex>
          {toChain ? (
            <Pill color="gray" className="relay-items-center relay-py-2 relay-px-3">
              <ChainTokenIcon
                chainId={toChain.id}
                tokenlogoURI={toTokenLogoUri}
                tokenSymbol={_toToken?.symbol}
                size="sm"
                chainRadius={2.5}
              />
              <Text style="subtitle1" className="relay-ml-2">
                {_toAmountFormatted} {_toToken?.symbol}
              </Text>
            </Pill>
          ) : (
            <Text style="subtitle1">?</Text>
          )}
        </Flex>
        <Text
          style="body2"
          className="relay-rounded-[12px] relay-text-center relay-p-4 relay-bg-[var(--relay-colors-gray2)]"
        >
          You can close this modal while it finalizes on the blockchain. The
          transaction will continue in the background.
        </Text>

        {(() => {
          // For refunds, show the refund tx from outTxs, not the original send tx
          if (isRefund) {
            const refundTxHash = transaction?.data?.outTxs?.[0]?.hash
            const refundChainId = transaction?.data?.outTxs?.[0]?.chainId

            // Only show if refund tx is available (don't fall back to send tx)
            if (refundTxHash && refundChainId) {
              const txUrl = getTxUrl(refundChainId, refundTxHash)
              const truncatedHash = truncateAddress(refundTxHash, '...', 6, 4)

              return txUrl && truncatedHash ? (
                <Anchor
                  href={txUrl}
                  target="_blank"
                  className="relay-text-center relay-text-[14px] relay-mt-[12px]"
                >
                  View Refund Tx: {truncatedHash}
                </Anchor>
              ) : null
            }
            // If refund but no outTxs yet, show loading or nothing
            return isLoadingTransaction ? (
              <Text
                style="body3"
                color="subtle"
                className="relay-text-center relay-mt-3"
              >
                Fetching refund transaction...
              </Text>
            ) : null
          }

          // Normal flow: show the first tx hash
          if (allTxHashes && allTxHashes.length > 0) {
            const txHash = allTxHashes[0]?.txHash
            const chainId = allTxHashes[0]?.chainId
            const txUrl =
              txHash && chainId ? getTxUrl(chainId, txHash) : undefined
            const truncatedHash = truncateAddress(txHash, '...', 6, 4)

            return txUrl && truncatedHash ? (
              <Anchor
                href={txUrl}
                target="_blank"
                className="relay-text-center relay-text-[14px] relay-mt-[12px]"
              >
                View Tx: {truncatedHash}
              </Anchor>
            ) : null
          }

          return null
        })()}
      </Flex>

      {!delayedTxUrl ? (
        <Flex
          direction="column"
          className="relay-p-3 relay-border relay-border-solid relay-border-[var(--relay-colors-subtle-border-color)] relay-gap-3 relay-w-full relay-rounded-[12px]"
        >
          <TransactionsByChain
            allTxHashes={allTxHashes}
            fromChain={fromChain}
            toChain={toChain}
            fillTx={null}
          />
        </Flex>
      ) : null}

      <Flex className="relay-w-full relay-gap-3 relay-mt-[8px]">
        <Button
          cta={true}
          color={'secondary'}
          onClick={() => {
            onOpenChange(false)
          }}
          className="relay-justify-center relay-w-full"
        >
          Done
        </Button>
        {delayedTxUrl ? (
          <a href={delayedTxUrl} className="relay-w-full" target="_blank">
            <Button
              cta={true}
              color={'primary'}
              className="relay-justify-center relay-w-max"
            >
              Track Progress
            </Button>
          </a>
        ) : null}
      </Flex>
    </>
  ) : (
    <>
      <Flex direction="column" align="center" justify="between">
        <div className="relay-animate-content-fade-in">
          <Flex align="center">
            <RelayIcon />
            <Flex
              align="center"
              justify="center"
              className="relay-rounded-full relay-border-2 relay-border-solid relay-border-white relay-w-[40px] relay-h-[40px] relay-bg-[var(--relay-colors-green9)] relay-text-white relay-ml-[-8px]"
            >
              <FontAwesomeIcon
                icon={faCheck}
                className="relay-h-[20px] relay-text-white"
              />
            </Flex>
          </Flex>
        </div>

        <Text
          style="h6"
          className="relay-text-center relay-my-3 [&_.green-time]:relay-text-[color:var(--relay-colors-green11)]"
        >
          {fillTime && fillTime !== '-' ? (
            <>
              Completed in <span className="green-time">{fillTime}</span>
            </>
          ) : (
            'Transaction Completed'
          )}
        </Text>

        <Flex
          direction="column"
          className="relay-gap-3 relay-p-3 relay-border relay-border-solid relay-border-[var(--relay-colors-slate-5)] relay-rounded-[12px] relay-w-full"
        >
          {_fromToken ? (
            <Flex direction="column" className="relay-gap-[4px]">
              <Text style="subtitle2" color="subtle">
                Sent
              </Text>
              <Flex justify="between">
                <Flex align="center" className="relay-gap-[4px]">
                  <ChainTokenIcon
                    size="sm"
                    chainId={_fromToken.chainId}
                    tokenlogoURI={fromTokenLogoUri}
                    tokenSymbol={_fromToken.symbol}
                    chainRadius={2.5}
                  />
                  {isLoadingTransaction ? (
                    <Skeleton
                      className="relay-h-[24px] relay-w-[60px] relay-bg-[var(--relay-colors-gray5)]"
                    />
                  ) : (
                    <Text style="h6">
                      {_fromAmountFormatted} {_fromToken.symbol}
                    </Text>
                  )}
                </Flex>
                {!isSameChainSwap &&
                  _fromToken?.chainId &&
                  (() => {
                    // For "Sent" section, always use the original send tx (skip refund check)
                    const txHash = getTxHashForChain(_fromToken.chainId, true)
                    const txUrl = txHash
                      ? getTxUrl(_fromToken.chainId, txHash)
                      : undefined
                    return txHash ? (
                      <Anchor
                        href={txUrl}
                        target="_blank"
                        className="relay-text-[color:var(--relay-colors-primary11)] relay-text-[14px]"
                      >
                        {truncateAddress(txHash, '...', 6, 4)}
                      </Anchor>
                    ) : null
                  })()}
              </Flex>
            </Flex>
          ) : (
            <Text style="subtitle1">?</Text>
          )}

          {_toToken ? (
            <Flex direction="column" className="relay-gap-[4px]">
              <Text style="subtitle2" color="subtle">
                Received
              </Text>
              <Flex justify="between">
                <Flex align="center" className="relay-gap-[4px]">
                  <ChainTokenIcon
                    size="sm"
                    chainId={_toToken.chainId}
                    tokenlogoURI={toTokenLogoUri}
                    tokenSymbol={_toToken.symbol}
                    chainRadius={2.5}
                  />
                  {isLoadingTransaction ? (
                    <Skeleton
                      className="relay-h-[24px] relay-w-[60px] relay-bg-[var(--relay-colors-gray5)]"
                    />
                  ) : (
                    <Text style="h6">
                      {_toAmountFormatted} {_toToken.symbol}
                    </Text>
                  )}
                </Flex>

                {_toToken?.chainId &&
                  (() => {
                    const txHash = getTxHashForChain(_toToken.chainId)
                    const txUrl = txHash
                      ? getTxUrl(_toToken.chainId, txHash)
                      : undefined
                    return txHash ? (
                      <Anchor
                        href={txUrl}
                        target="_blank"
                        className="relay-text-[color:var(--relay-colors-primary11)] relay-text-[14px]"
                      >
                        {truncateAddress(txHash, '...', 6, 4)}
                      </Anchor>
                    ) : null
                  })()}
              </Flex>

              {/* Additional Gas - positioned below transaction hash with 8px spacing */}
              {formattedGasTopUpAmount && gasTopUpAmountCurrency ? (
                <Flex align="center" className="relay-gap-[4px] relay-mt-[4px]">
                  <ChainTokenIcon
                    size="sm"
                    chainId={gasTopUpAmountCurrency.chainId}
                    tokenlogoURI={`${ASSETS_RELAY_API}/icons/currencies/${
                      gasTopUpAmountCurrency?.symbol?.toLowerCase() ??
                      gasTopUpAmountCurrency?.chainId
                    }.png`}
                    tokenSymbol={gasTopUpAmountCurrency.symbol}
                    chainRadius={2.5}
                  />
                  <Text style="h6">
                    {formattedGasTopUpAmount} {gasTopUpAmountCurrency.symbol}
                  </Text>
                </Flex>
              ) : null}
            </Flex>
          ) : (
            <Text style="subtitle1">?</Text>
          )}
        </Flex>
      </Flex>

      <Flex className="relay-w-full relay-gap-3">
        {requestId ? (
          <a
            href={`${baseTransactionUrl}/transaction/${requestId}`}
            className="relay-w-full"
            target="_blank"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <Button
              color="secondary"
              cta={true}
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
    </>
  )
}
