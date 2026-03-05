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
import { faRepeat } from '@fortawesome/free-solid-svg-icons/faRepeat'
import { truncateAddress } from '../../../../utils/truncate.js'
import { getTxBlockExplorerUrl } from '../../../../utils/getTxBlockExplorerUrl.js'
import useRelayClient from '../../../../hooks/useRelayClient.js'

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
        css={{ flexShrink: 0, bp500: { flexDirection: 'row' } }}
      >
        <Flex
          direction="column"
          css={{
            backgroundColor: 'subtle-background-color',
            p: '12px 16px',
            borderRadius: 12,
            gap: 1,
            width: '100%'
          }}
        >
          <Flex
            direction="column"
            align="start"
            css={{ gap: '1', cursor: 'pointer' }}
          >
            <ChainTokenIcon
              chainId={fromToken?.chainId}
              tokenlogoURI={fromToken?.logoURI}
              tokenSymbol={fromToken?.symbol}
              css={{ height: 32, width: 32 }}
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
          css={{
            color: 'gray9',
            p: '0 16px',
            bp400Down: { transform: 'rotate(90deg)' }
          }}
        >
          <FontAwesomeIcon icon={faArrowRight} width={16} />
        </Text>
        <Flex
          direction="column"
          css={{
            backgroundColor: 'subtle-background-color',
            p: '12px 16px',
            borderRadius: 12,
            gap: 1,
            width: '100%'
          }}
        >
          <Flex
            direction="column"
            align="start"
            css={{ gap: '1', cursor: 'pointer' }}
          >
            <ChainTokenIcon
              chainId={toToken?.chainId}
              tokenlogoURI={toToken?.logoURI}
              tokenSymbol={toToken?.symbol}
              css={{ height: 32, width: 32 }}
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
        css={{
          '--borderColor': 'colors.gray3',
          border: '1px solid var(--borderColor)',
          borderRadius: 12,
          p: '3',
          height: 260,
          gap: '8px'
        }}
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
                css={{ width: '100%', gap: '3' }}
              >
                <Flex align="center" css={{ gap: '2', height: 40 }}>
                  {step.id === 'approve' ? (
                    <ChainTokenIcon
                      chainId={fromToken?.chainId}
                      tokenlogoURI={fromToken?.logoURI}
                      tokenSymbol={fromToken?.symbol}
                      css={{
                        borderRadius: 9999999,
                        flexShrink: 0,
                        filter: isCurrentStep ? 'none' : 'grayscale(100%)'
                      }}
                    />
                  ) : (
                    <Flex
                      css={{
                        height: 32,
                        width: 32,
                        borderRadius: 9999999,
                        flexShrink: 0,
                        backgroundColor: isCurrentStep ? 'primary5' : 'gray5',
                        color: isCurrentStep ? 'primary8' : 'gray9',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FontAwesomeIcon icon={faRepeat} width={16} />
                    </Flex>
                  )}
                  <Flex direction="column" css={{ gap: '2px' }}>
                    <Text style="subtitle2">{stepTitle}</Text>
                    {isApproveStep && !hasTxHash && (
                      <Anchor
                        css={{ fontSize: 12 }}
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
                            css={{ fontSize: 12 }}
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
                      css={{ height: 16, width: 16, fill: 'gray9' }}
                    />
                  ) : step?.items?.every(
                      (item) => item.status === 'complete'
                    ) ? (
                    <Box css={{ color: 'green9' }}>
                      <FontAwesomeIcon icon={faCheck} width={16} />
                    </Box>
                  ) : null}
                </Flex>
              </Flex>

              {index !== (steps?.length || 0) - 1 && (
                <Box css={{ height: '14px', pl: '16px', marginTop: '12px' }}>
                  <Box
                    css={{
                      width: '1px',
                      height: '100%',
                      backgroundColor: 'gray11'
                    }}
                  />
                </Box>
              )}
            </Box>
          )
        })}
      </Flex>
    </>
  )
}
