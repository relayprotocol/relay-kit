import { type FC } from 'react'
import {
  Flex,
  Text,
  ChainTokenIcon,
  Box,
  Anchor
} from '../../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { LoadingSpinner } from '../../LoadingSpinner.js'
import { type Token } from '../../../../types/index.js'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight'
import type { useQuote } from '@relayprotocol/relay-kit-hooks'
import { formatDollar } from '../../../../utils/numbers.js'
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck'
import type { Execute } from '@relayprotocol/relay-sdk'
import { faRepeat } from '@fortawesome/free-solid-svg-icons'
import { truncateAddress } from '../../../../utils/truncate.js'
import { getTxBlockExplorerUrl } from '../../../../utils/getTxBlockExplorerUrl.js'
import useRelayClient from '../../../../hooks/useRelayClient.js'
import { cn } from '../../../../utils/cn.js'

type ApprovalPlusSwapStepProps = {
  fromToken?: Token
  toToken?: Token
  quote?: ReturnType<typeof useQuote>['data']
  fromAmountFormatted: string
  toAmountFormatted: string
  steps: Execute['steps'] | null
}

export const ApprovalPlusSwapStep: FC<ApprovalPlusSwapStepProps> = ({
  fromToken,
  toToken,
  quote,
  fromAmountFormatted,
  toAmountFormatted,
  steps
}) => {
  const details = quote?.details
  const relayClient = useRelayClient()

  return (
    <>
      <Flex
        align="center"
        justify="between"
        direction="column"
        className="relay-shrink-0 bp500:relay-flex-row"
      >
        <Flex
          direction="column"
          className="relay-bg-[var(--relay-colors-subtle-background-color)] relay-rounded-[12px] relay-gap-1 relay-w-full relay-py-[12px] relay-px-[16px]"
        >
          <Flex
            direction="column"
            align="start"
            className="relay-gap-1 relay-cursor-pointer"
          >
            <ChainTokenIcon
              chainId={fromToken?.chainId}
              tokenlogoURI={fromToken?.logoURI}
              tokenSymbol={fromToken?.symbol}
              className="relay-h-[32px] relay-w-[32px]"
            />
            <Text style="h6" ellipsify>
              {fromAmountFormatted} {fromToken?.symbol}
            </Text>
            <Text style="subtitle3" color="subtle">
              {formatDollar(Number(details?.currencyIn?.amountUsd))}
            </Text>
          </Flex>
        </Flex>
        <Text
          style="body1"
          className="relay-text-[color:var(--relay-colors-gray9)] relay-px-4 relay-py-0 bp400Down:relay-rotate-90"
        >
          <FontAwesomeIcon icon={faArrowRight} width={16} />
        </Text>
        <Flex
          direction="column"
          className="relay-bg-[var(--relay-colors-subtle-background-color)] relay-rounded-[12px] relay-gap-1 relay-w-full relay-py-[12px] relay-px-[16px]"
        >
          <Flex
            direction="column"
            align="start"
            className="relay-gap-1 relay-cursor-pointer"
          >
            <ChainTokenIcon
              chainId={toToken?.chainId}
              tokenlogoURI={toToken?.logoURI}
              tokenSymbol={toToken?.symbol}
              className="relay-h-[32px] relay-w-[32px]"
            />
            <Text style="h6" ellipsify>
              {toAmountFormatted} {toToken?.symbol}
            </Text>
            <Text style="subtitle3" color="subtle">
              {formatDollar(Number(details?.currencyOut?.amountUsd))}
            </Text>
          </Flex>
        </Flex>
      </Flex>
      <Flex
        direction="column"
        className="relay-border relay-border-solid relay-border-[var(--relay-colors-gray3)] relay-rounded-[12px] relay-p-3 relay-gap-2 relay-h-[260px]"
      >
        {steps?.map((step, index) => {
          const isCurrentStep =
            step.items?.some((item) => item.status === 'incomplete') &&
            !steps
              ?.slice(0, steps?.indexOf(step))
              ?.some((s) =>
                s.items?.some((item) => item.status === 'incomplete')
              )

          const hasTxHash =
            step?.items?.[0]?.txHashes?.length &&
            step?.items?.[0]?.txHashes?.length > 0

          const isApproveStep = step.id === 'approve'

          const stepTitle = isApproveStep
            ? 'Approve in wallet'
            : hasTxHash
              ? `Swapping ${fromToken?.symbol} for ${toToken?.symbol}`
              : 'Confirm swap in wallet'

          return (
            <Box key={step.id}>
              <Flex
                align="center"
                justify="between"
                className="relay-w-full relay-gap-3"
              >
                <Flex align="center" className="relay-gap-2 relay-h-[40px]">
                  {step.id === 'approve' ? (
                    <ChainTokenIcon
                      chainId={fromToken?.chainId}
                      tokenlogoURI={fromToken?.logoURI}
                      tokenSymbol={fromToken?.symbol}
                      className={cn(
                        'relay-rounded-full relay-shrink-0',
                        !isCurrentStep && 'relay-grayscale'
                      )}
                    />
                  ) : (
                    <Flex
                      className={cn(
                        'relay-rounded-full relay-shrink-0 relay-items-center relay-justify-center relay-h-[32px] relay-w-[32px]',
                        isCurrentStep
                          ? 'relay-bg-[var(--relay-colors-primary5)] relay-text-[color:var(--relay-colors-primary8)]'
                          : 'relay-bg-[var(--relay-colors-gray5)] relay-text-[color:var(--relay-colors-gray9)]'
                      )}
                    >
                      <FontAwesomeIcon icon={faRepeat} width={16} />
                    </Flex>
                  )}
                  <Flex direction="column" className="relay-gap-[2px]">
                    <Text style="subtitle2">{stepTitle}</Text>
                    {isApproveStep && !hasTxHash && (
                      <Anchor
                        className="relay-text-[12px]"
                        href="https://support.relay.link/en/articles/10371133-why-do-i-have-to-approve-a-token"
                        target="_blank"
                      >
                        Why do I have to approve a token?
                      </Anchor>
                    )}
                    {hasTxHash &&
                      step?.items?.[0]?.txHashes?.map(({ txHash, chainId }) => {
                        const txUrl = getTxBlockExplorerUrl(
                          chainId,
                          relayClient?.chains,
                          txHash
                        )
                        return (
                          <Anchor
                            key={txHash}
                            href={txUrl}
                            target="_blank"
                            className="relay-text-[12px]"
                          >
                            View Tx: {truncateAddress(txHash, '...', 6, 4)}
                          </Anchor>
                        )
                      })}
                  </Flex>
                </Flex>

                <Flex>
                  {isCurrentStep && hasTxHash ? (
                    <LoadingSpinner
                      className="relay-h-4 relay-w-4 relay-fill-[var(--relay-colors-gray9)]"
                    />
                  ) : step?.items?.every(
                      (item) => item.status === 'complete'
                    ) ? (
                    <Box className="relay-text-[color:var(--relay-colors-green9)]">
                      <FontAwesomeIcon icon={faCheck} width={16} />
                    </Box>
                  ) : null}
                </Flex>
              </Flex>

              {index !== (steps?.length || 0) - 1 && (
                <Box className="relay-pl-4 relay-h-[14px] relay-mt-3">
                  <Box className="relay-h-full relay-w-px relay-bg-[var(--relay-colors-gray11)]" />
                </Box>
              )}
            </Box>
          )
        })}
      </Flex>
    </>
  )
}
