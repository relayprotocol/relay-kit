import { useEffect, useState, type FC } from 'react'
import {
  Anchor,
  Box,
  Button,
  ChainTokenIcon,
  Flex,
  Pill,
  Text
} from '../../../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowUpRightFromSquare,
  faCheck,
  faUpRightFromSquare
} from '@fortawesome/free-solid-svg-icons'
import { truncateAddress } from '../../../../../utils/truncate.js'
import type { Token } from '../../../../../types/index.js'
import { OnrampProcessingStep } from '../OnrampModal.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import { LoadingSpinner } from '../../../../common/LoadingSpinner.js'

type OnrampProcessingStepUIProps = {
  toToken: Token
  fromToken: Token
  fromChain?: RelayChain
  toChain?: RelayChain
  moonpayTxUrl?: string
  fillTxUrl?: string
  fillTxHash?: string
  processingStep?: OnrampProcessingStep
  baseTransactionUrl: string
  requestId?: string
}

export const OnrampProcessingStepUI: FC<OnrampProcessingStepUIProps> = ({
  toToken,
  fromToken,
  fromChain,
  toChain,
  moonpayTxUrl,
  fillTxHash,
  fillTxUrl,
  processingStep,
  baseTransactionUrl,
  requestId
}) => {
  const [delayedMoonpayTx, setDelayedMoonpayTx] = useState(false)

  useEffect(() => {
    let timer: number | undefined
    if (processingStep === OnrampProcessingStep.Finalizing) {
      timer = setTimeout(
        () => {
          setDelayedMoonpayTx(true)
        },
        1000 * 60 * 5
      ) //5 minutes
    }

    return () => {
      if (timer) {
        setDelayedMoonpayTx(false)
        clearTimeout(timer)
      }
    }
  }, [processingStep])

  return (
    <Flex
      direction="column"
      css={{
        width: '100%',
        height: '100%'
      }}
    >
      <Text style="h6" css={{ mb: '4' }}>
        Processing Transaction
      </Text>
      <Flex
        direction="column"
        css={{
          width: '100%',
          overflow: 'hidden',
          borderRadius: 'widget-card-border-radius',
          '--borderColor': 'colors.subtle-border-color',
          border: '1px solid var(--borderColor)',
          p: '4',
          mb: '4'
        }}
      >
        <Flex align="center" css={{ gap: '2' }}>
          <ChainTokenIcon
            chainId={fromToken?.chainId}
            tokenlogoURI={fromToken?.logoURI}
            tokenSymbol={fromToken?.symbol}
            css={{
              width: 32,
              height: 32,
              filter:
                processingStep === OnrampProcessingStep.Relaying
                  ? 'grayscale(1)'
                  : 'none'
            }}
          />
          <Flex css={{ gap: '1' }} direction="column">
            <Text
              style="subtitle1"
              color={
                processingStep === OnrampProcessingStep.Relaying
                  ? 'subtle'
                  : undefined
              }
            >
              {processingStep === OnrampProcessingStep.Relaying
                ? `Purchased ${fromToken?.symbol}(${fromChain?.displayName}) via your card`
                : `Finalizing your purchase of ${fromToken?.symbol}(${fromChain?.displayName}) via your card`}
            </Text>
            {moonpayTxUrl ? (
              <Anchor
                href={moonpayTxUrl}
                target="_blank"
                css={{ display: 'flex', alignItems: 'center', gap: '1' }}
              >
                Track MoonPay transaction{' '}
                <FontAwesomeIcon
                  icon={faUpRightFromSquare}
                  style={{ width: 14 }}
                />
              </Anchor>
            ) : null}
          </Flex>
          {processingStep === OnrampProcessingStep.Relaying ? (
            <Box css={{ color: 'green9', ml: 'auto' }}>
              <FontAwesomeIcon icon={faCheck} style={{ height: 16 }} />
            </Box>
          ) : (
            <LoadingSpinner
              css={{ height: 20, width: 20, fill: 'gray9', ml: 'auto' }}
            />
          )}
        </Flex>
        {processingStep === OnrampProcessingStep.Finalizing ? (
          delayedMoonpayTx ? (
            <Flex
              direction="column"
              css={{
                width: '100%',
                overflow: 'hidden',
                borderRadius: 'widget-card-border-radius',
                '--borderColor': 'colors.subtle-border-color',
                border: '1px solid var(--borderColor)',
                p: '2',
                mb: '6px',
                gap: '3',
                mt: '6px'
              }}
            >
              <Text color="warning" style="subtitle2">
                Looks like its taking longer than expected. Please go to MoonPay
                to track your transaction.
              </Text>
              <Button
                cta={true}
                color="warning"
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2',
                  justifyContent: 'center'
                }}
                onClick={(e) => {
                  window.open(moonpayTxUrl, '_blank')
                }}
              >
                Go to MoonPay{' '}
                <FontAwesomeIcon
                  icon={faArrowUpRightFromSquare}
                  style={{ width: 16, height: 16 }}
                />
              </Button>
            </Flex>
          ) : (
            <Pill
              radius="rounded"
              color="gray"
              css={{ width: '100%', py: '2', px: '3', mt: '6px' }}
            >
              <Text style="subtitle2" color="subtle">
                It might take a few minutes for the MoonPay transaction to
                finalize.
              </Text>
            </Pill>
          )
        ) : null}

        <Box
          css={{
            height: 24,
            width: 1,
            background: 'gray5',
            my: '5px',
            ml: 4
          }}
        />
        <Flex
          align="center"
          css={{
            gap: '2'
          }}
        >
          <ChainTokenIcon
            chainId={toToken?.chainId}
            tokenlogoURI={toToken?.logoURI}
            css={{
              width: 32,
              height: 32,
              filter:
                processingStep === OnrampProcessingStep.Relaying
                  ? 'none'
                  : 'grayscale(1)'
            }}
          />
          <Flex css={{ gap: '1' }} direction="column">
            <Text
              style="subtitle1"
              color={
                processingStep === OnrampProcessingStep.Relaying
                  ? undefined
                  : 'subtle'
              }
            >
              {processingStep === OnrampProcessingStep.Relaying
                ? `Converting to ${toToken?.symbol}(${toChain?.displayName})`
                : `Relay converts to ${toToken?.symbol}(${toChain?.displayName})`}
            </Text>
            {fillTxUrl ? (
              <Anchor
                href={fillTxUrl}
                target="_blank"
                css={{ display: 'flex', alignItems: 'center', gap: '1' }}
              >
                View Tx: {truncateAddress(fillTxHash)}
              </Anchor>
            ) : null}
          </Flex>
          {processingStep === OnrampProcessingStep.Relaying ? (
            <LoadingSpinner
              css={{ height: 16, width: 16, fill: 'gray9', ml: 'auto' }}
            />
          ) : null}
        </Flex>
      </Flex>
      {processingStep === OnrampProcessingStep.Relaying ? (
        <Text style="body2" color="subtle">
          Feel free to leave at any time, you can track your progress within the
          <Anchor
            href={`${baseTransactionUrl}/transaction/${requestId}`}
            target="_blank"
            css={{ ml: '1' }}
          >
            transaction page
          </Anchor>
          .
        </Text>
      ) : (
        <Text style="subtitle2" color="subtle">
          This transaction occurs in two steps. MoonPay powers only your
          purchase of {fromToken?.symbol} ({fromChain?.displayName}) which Relay
          then converts to {toToken?.symbol} ({toChain?.displayName}).
          <Anchor
            href="https://support.relay.link/en/articles/10517947-fiat-on-ramps"
            target="_blank"
            css={{ ml: '1' }}
          >
            Learn more
          </Anchor>
        </Text>
      )}
    </Flex>
  )
}
