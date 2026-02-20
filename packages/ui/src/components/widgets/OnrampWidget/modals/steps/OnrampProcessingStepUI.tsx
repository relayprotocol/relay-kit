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
      className="relay-w-full relay-h-full"
    >
      <Text style="h6" className="relay-mb-4">
        Processing Transaction
      </Text>
      <Flex
        direction="column"
        className="relay-w-full relay-overflow-hidden relay-p-4 relay-mb-4 relay-rounded-widget-card relay-border relay-border-solid relay-border-[var(--relay-colors-subtle-border-color)]"
      >
        <Flex align="center" className="relay-gap-2">
          <div style={{
            filter:
              processingStep === OnrampProcessingStep.Relaying
                ? 'grayscale(1)'
                : 'none'
          }}>
            <ChainTokenIcon
              chainId={fromToken?.chainId}
              tokenlogoURI={fromToken?.logoURI}
              tokenSymbol={fromToken?.symbol}
            />
          </div>
          <Flex className="relay-gap-1" direction="column">
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
                className="relay-flex relay-items-center relay-gap-1"
              >
                Track MoonPay transaction{' '}
                <FontAwesomeIcon
                  icon={faUpRightFromSquare}
                  className="relay-w-[14px]"
                />
              </Anchor>
            ) : null}
          </Flex>
          {processingStep === OnrampProcessingStep.Relaying ? (
            <Box className="relay-text-[color:var(--relay-colors-green9)] relay-ml-auto">
              <FontAwesomeIcon icon={faCheck} className="relay-h-[16px]" />
            </Box>
          ) : (
            <LoadingSpinner
              className="relay-h-[20px] relay-w-[20px] relay-fill-[var(--relay-colors-gray9)] relay-ml-auto"
            />
          )}
        </Flex>
        {processingStep === OnrampProcessingStep.Finalizing ? (
          delayedMoonpayTx ? (
            <Flex
              direction="column"
              className="relay-w-full relay-overflow-hidden relay-p-2 relay-mb-[6px] relay-gap-3 relay-mt-[6px] relay-rounded-widget-card relay-border relay-border-solid relay-border-[var(--relay-colors-subtle-border-color)]"
            >
              <Text color="warning" style="subtitle2">
                Looks like its taking longer than expected. Please go to MoonPay
                to track your transaction.
              </Text>
              <Button
                cta={true}
                color="warning"
                className="relay-flex relay-items-center relay-gap-2 relay-justify-center"
                onClick={(e) => {
                  window.open(moonpayTxUrl, '_blank')
                }}
              >
                Go to MoonPay{' '}
                <FontAwesomeIcon
                  icon={faArrowUpRightFromSquare}
                  className="relay-w-[16px] relay-h-[16px]"
                />
              </Button>
            </Flex>
          ) : (
            <Pill
              radius="rounded"
              color="gray"
              className="relay-w-full relay-py-2 relay-px-3 relay-mt-[6px]"
            >
              <Text style="subtitle2" color="subtle">
                It might take a few minutes for the MoonPay transaction to
                finalize.
              </Text>
            </Pill>
          )
        ) : null}

        <div
          className="relay-ml-[16px] relay-h-[24px] relay-w-px relay-bg-[var(--relay-colors-gray5)] relay-mt-[5px] relay-mb-[5px]"
        />
        <Flex
          align="center"
          className="relay-gap-2"
        >
          <div style={{
            filter:
              processingStep === OnrampProcessingStep.Relaying
                ? 'none'
                : 'grayscale(1)'
          }}>
            <ChainTokenIcon
              chainId={toToken?.chainId}
              tokenlogoURI={toToken?.logoURI}
            />
          </div>
          <Flex className="relay-gap-1" direction="column">
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
                className="relay-flex relay-items-center relay-gap-1"
              >
                View Tx: {truncateAddress(fillTxHash)}
              </Anchor>
            ) : null}
          </Flex>
          {processingStep === OnrampProcessingStep.Relaying ? (
            <LoadingSpinner
              className="relay-h-[16px] relay-w-[16px] relay-fill-[var(--relay-colors-gray9)] relay-ml-auto"
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
            className="relay-ml-1"
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
            className="relay-ml-1"
          >
            Learn more
          </Anchor>
        </Text>
      )}
    </Flex>
  )
}
