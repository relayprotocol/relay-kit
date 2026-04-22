import { useMemo, type FC } from 'react'
import { Flex, Text, ChainTokenIcon, Box } from '../../../primitives/index.js'
import { LoadingSpinner } from '../../LoadingSpinner.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type Token } from '../../../../types/index.js'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight'
import type { Execute, RelayChain } from '@relayprotocol/relay-sdk'
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck'
import { formatTransactionSteps } from '../../../../utils/steps.js'
import { formatBN } from '../../../../utils/numbers.js'
import { getTxBlockExplorerUrl } from '../../../../utils/getTxBlockExplorerUrl.js'
import useRelayClient from '../../../../hooks/useRelayClient.js'
import { StepIcon } from '../../StepIcon.js'
import { cn } from '../../../../utils/cn.js'

type SwapConfirmationStepProps = {
  fromToken?: Token
  toToken?: Token
  fromChain?: RelayChain
  toChain?: RelayChain
  fromAmountFormatted: string
  toAmountFormatted: string
  quote?: Execute | null
  steps: Execute['steps'] | null
  currentAddress?: string
  linkedWallets?: any[]
}

export const SwapConfirmationStep: FC<SwapConfirmationStepProps> = ({
  fromToken,
  toToken,
  fromChain,
  toChain,
  fromAmountFormatted,
  toAmountFormatted,
  quote,
  steps,
  currentAddress,
  linkedWallets
}) => {
  const operation = quote?.details?.operation || 'swap'

  const { formattedSteps } = useMemo(
    () =>
      formatTransactionSteps({
        steps,
        fromToken,
        toToken,
        fromChain,
        toChain,
        operation,
        quote,
        currentAddress,
        linkedWallets
      }),
    [
      steps,
      fromToken,
      toToken,
      fromChain,
      toChain,
      operation,
      quote,
      currentAddress,
      linkedWallets
    ]
  )

  const gasTopUpAmountCurrency = quote?.details?.currencyGasTopup?.currency
  const formattedGasTopUpAmount = quote?.details?.currencyGasTopup?.amount
    ? formatBN(
        BigInt(quote?.details?.currencyGasTopup?.amount),
        5,
        gasTopUpAmountCurrency?.decimals ?? 18
      )
    : undefined

  return (
    <>
      <Flex
        align="center"
        justify="between"
        direction="column"
        className="relay:shrink-0 relay:bp500:flex-row"
      >
        <Flex
          direction="row"
          className="relay:bg-[var(--relay-colors-subtle-background-color)] relay:rounded-[12px] relay:gap-2 relay:w-full relay:items-center relay:bp500:flex-col relay:bp500:gap-1 relay:bp500:items-start relay:py-[12px] relay:px-[16px]"
        >
          <ChainTokenIcon
            chainId={fromToken?.chainId}
            tokenlogoURI={fromToken?.logoURI}
            tokenSymbol={fromToken?.symbol}
            className="relay:h-[32px] relay:w-[32px]"
          />
          <Flex direction="column" align="start" className="relay:gap-1">
            <Text color="subtle" style="subtitle2">
              {fromChain?.displayName}
            </Text>
            <Text style="h6" ellipsify className="relay:leading-[20px]">
              {fromAmountFormatted} {fromToken?.symbol}
            </Text>
          </Flex>
        </Flex>
        <Text
          style="body1"
          color="subtle"
          className="relay:px-3 relay:py-0 relay:bp400Down:rotate-90 relay:bp400Down:py-3 relay:bp400Down:px-0"
        >
          <FontAwesomeIcon icon={faArrowRight} width={16} />
        </Text>
        <Flex
          direction="row"
          className="relay:bg-[var(--relay-colors-subtle-background-color)] relay:rounded-[12px] relay:gap-2 relay:w-full relay:items-center relay:bp500:flex-col relay:bp500:gap-1 relay:bp500:items-start relay:py-[12px] relay:px-[16px]"
        >
          <ChainTokenIcon
            chainId={toToken?.chainId}
            tokenlogoURI={toToken?.logoURI}
            tokenSymbol={toToken?.symbol}
            className="relay:h-[32px] relay:w-[32px]"
          />
          <Flex direction="column" align="start" className="relay:gap-1">
            <Text color="subtle" style="subtitle2">
              {toChain?.displayName}
            </Text>
            <Text style="h6" ellipsify className="relay:leading-[20px]">
              {toAmountFormatted} {toToken?.symbol}
            </Text>
          </Flex>
        </Flex>
      </Flex>
      {formattedGasTopUpAmount ? (
        <Flex
          direction="row"
          justify="between"
          className="relay:bg-[var(--relay-colors-subtle-background-color)] relay:rounded-[12px] relay:gap-2 relay:w-full relay:items-center relay:py-[12px] relay:px-[16px]"
        >
          <Text style="subtitle2" color="subtle">
            Additional Gas
          </Text>
          <Text style="subtitle2">
            {formattedGasTopUpAmount} {gasTopUpAmountCurrency?.symbol}
          </Text>
        </Flex>
      ) : null}
      <Flex
        direction="column"
        className="relay:border relay:border-solid relay:border-[var(--relay-colors-gray3)] relay:rounded-[12px] relay:px-3 relay:py-2 relay:gap-1"
      >
        {formattedSteps.map((step, index) => (
          <Box key={step.id}>
            <StepRow {...step} />

            {index !== formattedSteps.length - 1 && (
              <Box className="relay:pl-3 relay:h-[14px] relay:mt-[4px]">
                <Box className="relay:h-full relay:w-px relay:bg-[var(--relay-colors-gray7)]" />
              </Box>
            )}
          </Box>
        ))}
      </Flex>
    </>
  )
}

export type StepRowProps = {
  id: string
  action: string
  isActive: boolean
  isCompleted: boolean
  txHashes?: { txHash: string; chainId: number }[]
  isWalletAction: boolean
  chainId?: number
  isApproveStep?: boolean
  subText?: string
  subTextColor?: 'primary11' | 'green11' | 'subtle' | 'slate10'
  showSubTextSpinner?: boolean
}

export const StepRow: FC<StepRowProps> = ({
  id,
  action,
  isActive,
  isCompleted,
  txHashes,
  isWalletAction,
  chainId,
  isApproveStep,
  subText,
  subTextColor,
  showSubTextSpinner
}) => {
  const relayClient = useRelayClient()
  const chains = relayClient?.chains
  return (
    <Flex align="center" justify="between" className="relay:w-full relay:gap-3">
      <Flex align="center" className="relay:gap-3 relay:h-[40px]">
        <Flex
          data-active={isActive && !isCompleted}
          className={cn(
            'relay:shrink-0 relay:items-center relay:justify-center relay:rounded-full relay:h-[30px] relay:w-[30px]',
            isCompleted
              ? 'relay:bg-[var(--relay-colors-green3)]'
              : isActive
                ? 'relay:bg-[var(--relay-colors-primary6)]'
                : 'relay:bg-[var(--relay-colors-gray5)]'
          )}
          style={{
            color: isActive && !isCompleted
              ? 'var(--relay-colors-primary11)'
              : isCompleted
                ? 'var(--relay-colors-green11)'
                : isActive
                  ? 'var(--relay-colors-primary11)'
                  : 'var(--relay-colors-gray9)',
            animation:
              isActive && !isCompleted
                ? 'relay-pulse-shadow 1s infinite alternate-reverse'
                : 'none'
          }}
        >
          {isCompleted ? (
            <FontAwesomeIcon icon={faCheck} width={12} />
          ) : (
            <StepIcon stepId={id} chainId={chainId} />
          )}
        </Flex>
        <Flex direction="column" className="relay:gap-[2px]">
          <Text style="subtitle2" color={isActive ? undefined : 'subtle'}>
            {action}
          </Text>

          {subText && (
            <Flex align="center" className="relay:gap-[6px]">
              {(() => {
                // Handle "Success: txhash" case with split colors and link
                if (subText.startsWith('Success:')) {
                  const [successText, hashPart] = subText.split(': ')
                  const fullHash = txHashes?.[0]?.txHash
                  const chainId = txHashes?.[0]?.chainId
                  const txUrl =
                    fullHash && chainId
                      ? getTxBlockExplorerUrl(chainId, chains, fullHash)
                      : undefined

                  return (
                    <Flex align="center" className="relay:gap-[4px]">
                      <Text
                        style="subtitle3"
                        color="green"
                      >
                        {successText}:
                      </Text>
                      {hashPart &&
                        (fullHash && txUrl ? (
                          <a
                            href={txUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relay:no-underline"
                          >
                            <Text
                              style="subtitle3"
                              color="primary"
                            >
                              {hashPart}
                            </Text>
                          </a>
                        ) : (
                          <Text
                            style="subtitle3"
                            color="primary"
                          >
                            {hashPart}
                          </Text>
                        ))}
                    </Flex>
                  )
                }

                // Handle "Sending to Relay: txhash" and "Receiving: txhash" cases with links
                if (
                  subText.includes(': ') &&
                  (subText.startsWith('Sending to Relay:') ||
                    subText.startsWith('Receiving:'))
                ) {
                  const [labelText, hashPart] = subText.split(': ')
                  const fullHash = txHashes?.[0]?.txHash
                  const chainId = txHashes?.[0]?.chainId
                  const txUrl =
                    fullHash && chainId
                      ? getTxBlockExplorerUrl(chainId, chains, fullHash)
                      : undefined

                  return (
                    <Flex align="center" className="relay:gap-[4px]">
                      <Text
                        style="subtitle3"
                        color="primary"
                      >
                        {labelText}:
                      </Text>
                      {hashPart &&
                        (fullHash && txUrl ? (
                          <a
                            href={txUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relay:no-underline"
                          >
                            <Text
                              style="subtitle3"
                              color="primary"
                            >
                              {hashPart}
                            </Text>
                          </a>
                        ) : (
                          <Text
                            style="subtitle3"
                            color="primary"
                          >
                            {hashPart}
                          </Text>
                        ))}
                    </Flex>
                  )
                }

                return (
                  <Text
                    style="subtitle3"
                    color={
                      subTextColor === 'slate10'
                        ? 'slate'
                        : subTextColor === 'subtle'
                          ? 'subtle'
                          : subTextColor === 'green11'
                            ? 'green'
                            : 'primary'
                    }
                  >
                    {subText}
                  </Text>
                )
              })()}
              {showSubTextSpinner && (
                <LoadingSpinner className="relay:h-3 relay:w-3" />
              )}
            </Flex>
          )}
        </Flex>
      </Flex>
    </Flex>
  )
}
