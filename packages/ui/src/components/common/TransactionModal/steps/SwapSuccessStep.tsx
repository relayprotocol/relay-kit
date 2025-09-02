import { useContext, type FC } from 'react'
import {
  Box,
  Button,
  Flex,
  Pill,
  Text,
  ChainTokenIcon,
  ChainIcon,
  Skeleton,
  Anchor
} from '../../../primitives/index.js'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBolt } from '@fortawesome/free-solid-svg-icons/faBolt'
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck'
import { type TxHashes } from '../TransactionModalRenderer.js'
import { type Token } from '../../../../types/index.js'
import type { useRequests } from '@relayprotocol/relay-kit-hooks'
import { useRelayClient } from '../../../../hooks/index.js'
import { faClockFour } from '@fortawesome/free-solid-svg-icons/faClockFour'
import type { Execute } from '@relayprotocol/relay-sdk'
import { bitcoin } from '../../../../utils/bitcoin.js'
import { formatBN } from '../../../../utils/numbers.js'
import { TransactionsByChain } from './TransactionsByChain.js'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { XIcon } from '../../../../icons/index.js'
import { ProviderOptionsContext } from '../../../../providers/RelayKitProvider.js'

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
  isCanonical?: boolean
  details?: Execute['details'] | null
  isLoadingTransaction?: boolean
  onOpenChange: (open: boolean) => void
  requestId: string | null
  isGasSponsored?: boolean
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
  isCanonical,
  details,
  isLoadingTransaction,
  onOpenChange,
  requestId,
  isGasSponsored
}) => {
  const relayClient = useRelayClient()
  const isWrap = details?.operation === 'wrap'
  const isUnwrap = details?.operation === 'unwrap'
  const providerOptionsContext = useContext(ProviderOptionsContext)

  const _fromAmountFormatted = transaction?.data?.metadata?.currencyIn?.amount
    ? formatBN(
        transaction?.data?.metadata?.currencyIn?.amount,
        5,
        transaction?.data?.metadata?.currencyIn?.currency?.decimals ?? 18
      )
    : fromAmountFormatted
  const _fromToken =
    transaction?.data?.metadata?.currencyIn?.currency ?? fromToken
  const fromTokenLogoUri =
    transaction?.data?.metadata?.currencyIn?.currency?.metadata?.logoURI ??
    fromToken?.logoURI
  const _toAmountFormatted = transaction?.data?.metadata?.currencyOut?.amount
    ? formatBN(
        transaction?.data?.metadata?.currencyOut?.amount,
        5,
        transaction?.data?.metadata?.currencyOut?.currency?.decimals ?? 18
      )
    : toAmountFormatted
  const _toToken = transaction?.data?.metadata?.currencyOut?.currency ?? toToken
  const toTokenLogoUri =
    transaction?.data?.metadata?.currencyOut?.currency?.metadata?.logoURI ??
    toToken?.logoURI

  const actionTitle = isWrap ? 'wrapped' : isUnwrap ? 'unwrapped' : 'swapped'
  const baseTransactionUrl = relayClient?.baseApiUrl.includes('testnets')
    ? 'https://testnets.relay.link'
    : 'https://relay.link'
  const fromChain = _fromToken
    ? relayClient?.chains.find((chain) => chain.id === _fromToken?.chainId)
    : null
  const toChain = _toToken
    ? relayClient?.chains.find((chain) => chain.id === _toToken?.chainId)
    : null
  const delayedTxUrl = requestId
    ? `${baseTransactionUrl}/transaction/${requestId}`
    : null
  const timeEstimateMs =
    ((details?.timeEstimate ?? 0) +
      (fromChain && fromChain.id === bitcoin.id ? 600 : 0)) *
    1000
  const isDelayedTx =
    isCanonical ||
    timeEstimateMs >
      (relayClient?.maxPollingAttemptsBeforeTimeout ?? 30) *
        (relayClient?.pollingInterval ?? 5000)

  const gasTopUpAmountCurrency =
    transaction?.data?.metadata?.currencyGasTopup?.currency
  const formattedGasTopUpAmount = transaction?.data?.metadata?.currencyGasTopup
    ?.amount
    ? formatBN(
        BigInt(transaction?.data?.metadata?.currencyGasTopup?.amount),
        5,
        gasTopUpAmountCurrency?.decimals ?? 18
      )
    : undefined

  const showDetails =
    !allTxHashes.every((tx) => tx.isBatchTx) || formattedGasTopUpAmount
  const shareIconFill =
    providerOptionsContext.themeScheme === 'dark' ? '#fff' : '#000'

  return isDelayedTx ? (
    <>
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
              width: 78,
              position: 'relative',
              backgroundColor: 'amber2',
              borderRadius: '999999px'
            }}
          >
            <svg
              style={{ position: 'absolute', top: 7, left: 0, zIndex: 0 }}
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

            <Box css={{ color: 'amber9', mr: '$2', zIndex: 1 }}>
              <FontAwesomeIcon icon={faClockFour} style={{ height: 32 }} />
            </Box>
          </Flex>
        </motion.div>

        <Text style="subtitle1" css={{ mt: '4', mb: '2', textAlign: 'center' }}>
          Processing the order to swap {_fromAmountFormatted}{' '}
          {_fromToken?.symbol} into {_toAmountFormatted} {_toToken?.symbol},
          this will take ~{timeEstimate}.
        </Text>

        <Flex align="center" css={{ gap: '2', mb: 24 }}>
          {fromChain ? (
            <Pill color="gray" css={{ alignItems: 'center', py: '2', px: '3' }}>
              <ChainIcon chainId={fromChain.id} height={20} width={20} />
              <Text style="subtitle1">{fromChain.displayName}</Text>
            </Pill>
          ) : (
            <Text style="subtitle1">?</Text>
          )}
          <Flex
            css={{ alignItems: 'center', justifyContent: 'center', p: '2' }}
          >
            <FontAwesomeIcon style={{ width: 14 }} icon={faArrowRight} />
          </Flex>
          {toChain ? (
            <Pill color="gray" css={{ alignItems: 'center', py: '2' }}>
              <ChainIcon chainId={toChain.id} height={20} width={20} />
              <Text style="subtitle1">{toChain.displayName}</Text>
            </Pill>
          ) : (
            <Text style="subtitle1">?</Text>
          )}
        </Flex>
        <Text
          css={{
            background: 'gray2',
            p: '4',
            borderRadius: 12,
            textAlign: 'center'
          }}
          style="body2"
        >
          You can close this modal while it finalizes on the blockchain. The
          transaction will continue in the background.
        </Text>
      </Flex>

      {!delayedTxUrl ? (
        <Flex
          direction="column"
          css={{
            p: '3',
            '--borderColor': 'colors.subtle-border-color',
            border: '1px solid var(--borderColor)',
            gap: '3',
            width: '100%',
            borderRadius: 12
          }}
        >
          {formattedGasTopUpAmount ? (
            <Flex justify="between">
              <Text style="subtitle2" color="subtle">
                Additional Gas
              </Text>
              <Text style="subtitle2">
                {formattedGasTopUpAmount} {gasTopUpAmountCurrency?.symbol}
              </Text>
            </Flex>
          ) : null}
          <TransactionsByChain
            allTxHashes={allTxHashes}
            fromChain={fromChain}
            toChain={toChain}
          />
        </Flex>
      ) : null}

      <Flex css={{ width: '100%', mt: 8, gap: '3' }}>
        <Button
          cta={true}
          color={'secondary'}
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
        {delayedTxUrl ? (
          <a href={delayedTxUrl} style={{ width: '100%' }} target="_blank">
            <Button
              cta={true}
              color={'primary'}
              css={{
                justifyContent: 'center',
                width: 'max-content'
              }}
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
            {fillTime !== '-' && seconds <= 10 && seconds >= 0 ? (
              <Text style="h3">{fillTime}</Text>
            ) : (
              <Box css={{ color: 'green9', mr: '$2' }}>
                <FontAwesomeIcon icon={faCheck} style={{ height: 40 }} />
              </Box>
            )}
            <Flex
              align="center"
              justify="center"
              css={{
                position: 'absolute',
                width: 50,
                height: 50,
                background: 'modal-background',
                color: 'primary-color',
                '--borderColor': 'colors.subtle-border-color',
                border: '3px solid var(--borderColor)',
                borderRadius: '999999px',
                right: -40,
                bottom: -12
              }}
            >
              <Box css={{ width: 29, height: 27 }}>
                <FontAwesomeIcon
                  icon={faBolt}
                  width={29}
                  height={27}
                  style={{ height: 27 }}
                />
              </Box>
            </Flex>
          </Flex>
        </motion.div>

        <Text style="subtitle1" css={{ mt: '4', mb: '2', textAlign: 'center' }}>
          Successfully {actionTitle}
        </Text>

        <Flex align="center" css={{ gap: '2', mb: 20 }}>
          {_fromToken ? (
            <Pill
              color="gray"
              css={{ alignItems: 'center', py: '2', px: '3', gap: '2' }}
            >
              <ChainTokenIcon
                chainId={_fromToken.chainId}
                tokenlogoURI={fromTokenLogoUri}
                tokenSymbol={_fromToken.symbol}
              />
              {isLoadingTransaction ? (
                <Skeleton
                  css={{ height: 24, width: 60, background: 'gray5' }}
                />
              ) : (
                <Text style="subtitle1" ellipsify>
                  {_fromAmountFormatted} {_fromToken.symbol}
                </Text>
              )}
            </Pill>
          ) : (
            <Text style="subtitle1">?</Text>
          )}
          <Text style="subtitle1" color="subtle">
            to
          </Text>
          {_toToken ? (
            <Pill
              color="gray"
              css={{ alignItems: 'center', py: '2', px: '3', gap: '2' }}
            >
              <ChainTokenIcon
                chainId={_toToken.chainId}
                tokenlogoURI={toTokenLogoUri}
                tokenSymbol={_toToken.symbol}
              />
              {isLoadingTransaction ? (
                <Skeleton
                  css={{ height: 24, width: 60, background: 'gray5' }}
                />
              ) : (
                <Text style="subtitle1" ellipsify>
                  {_toAmountFormatted} {_toToken.symbol}
                </Text>
              )}
            </Pill>
          ) : (
            <Text style="subtitle1">?</Text>
          )}
        </Flex>
        {showDetails && (
          <Flex
            direction="column"
            css={{
              p: '3',
              '--borderColor': 'colors.subtle-border-color',
              border: '1px solid var(--borderColor)',
              gap: '3',
              width: '100%',
              borderRadius: 12
            }}
          >
            {formattedGasTopUpAmount ? (
              <Flex justify="between">
                <Text style="subtitle2" color="subtle">
                  Additional Gas
                </Text>
                <Text style="subtitle2">
                  {formattedGasTopUpAmount} {gasTopUpAmountCurrency?.symbol}
                </Text>
              </Flex>
            ) : null}
            <TransactionsByChain
              allTxHashes={allTxHashes}
              fromChain={fromChain}
              toChain={toChain}
            />
          </Flex>
        )}
      </Flex>

      {isGasSponsored && _toToken?.symbol === 'USDC' ? (
        <Flex
          css={{
            p: '3',
            gap: '3',
            width: '100%',
            borderRadius: 12,
            background: 'primary2',
            justifyItems: 'space-between'
          }}
        >
          <Text style="subtitle2">You've completed a free USDC bridge!</Text>
          <Anchor
            href="https://x.com/intent/post?text=Just%20instantly%20bridged%20USDC%20with%20ZERO%20price%20impact%2C%20thanks%20to%20%40RelayProtcol%20%27s%20Fee-Free%20September.%0A%0ATry%20it%20yourself%3A%20go.relay.link%2Ffreeusdc"
            target="_blank"
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: '1',
              ml: 'auto'
            }}
          >
            Share on <XIcon width={14} height={14} fill={shareIconFill} />
          </Anchor>
        </Flex>
      ) : null}

      <Flex css={{ width: '100%', mt: 8, gap: '3' }}>
        {requestId ? (
          <a
            href={`${baseTransactionUrl}/transaction/${requestId}`}
            style={{ width: '100%' }}
            target="_blank"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <Button
              color="secondary"
              cta={true}
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
    </>
  )
}
