import { useMemo, type FC } from 'react'
import {
  Flex,
  Text,
  ChainTokenIcon,
  Box,
  ChainIcon
} from '../../../primitives/index.js'
import { LoadingSpinner } from '../../LoadingSpinner.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type Token } from '../../../../types/index.js'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons/faArrowRight'
import type { Execute, RelayChain } from '@relayprotocol/relay-sdk'
import useRelayClient from '../../../../hooks/useRelayClient.js'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { formatTransactionSteps } from '../../../../utils/steps.js'
import { formatBN } from '../../../../utils/numbers.js'
import {
  FileSignature,
  Shuffle,
  ArrowRightFromLine,
  ArrowLeftToLine
} from '../../../../icons/index.js'

type SwapConfirmationStepProps = {
  fromToken?: Token
  toToken?: Token
  fromChain?: RelayChain
  toChain?: RelayChain
  fromAmountFormatted: string
  toAmountFormatted: string
  quote?: Execute | null
  steps: Execute['steps'] | null
}

export const SwapConfirmationStep: FC<SwapConfirmationStepProps> = ({
  fromToken,
  toToken,
  fromChain,
  toChain,
  fromAmountFormatted,
  toAmountFormatted,
  quote,
  steps
}) => {
  const operation = quote?.details?.operation || 'swap'

  const { formattedSteps, status } = useMemo(
    () =>
      formatTransactionSteps({
        steps,
        fromToken,
        toToken,
        fromChain,
        toChain,
        operation,
        quote
      }),
    [steps, fromToken, toToken, fromChain, toChain, operation, quote]
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
        css={{ flexShrink: 0, bp500: { flexDirection: 'row' } }}
      >
        <Flex
          direction="row"
          css={{
            backgroundColor: 'subtle-background-color',
            p: '12px 16px',
            borderRadius: 12,
            gap: 2,
            width: '100%',
            alignItems: 'center',
            bp500: { flexDirection: 'column', gap: 1, alignItems: 'flex-start' }
          }}
        >
          <ChainTokenIcon
            chainId={fromToken?.chainId}
            tokenlogoURI={fromToken?.logoURI}
            tokenSymbol={fromToken?.symbol}
            css={{ height: 32, width: 32 }}
          />
          <Flex direction="column" align="start" css={{ gap: '1' }}>
            <Text color="subtle" style="subtitle2">
              {fromChain?.displayName}
            </Text>
            <Text style="h6" ellipsify css={{ lineHeight: '20px' }}>
              {fromAmountFormatted} {fromToken?.symbol}
            </Text>
          </Flex>
        </Flex>
        <Text
          style="body1"
          css={{
            color: 'gray9',
            p: '0 12px',
            bp400Down: { transform: 'rotate(90deg)', p: '12px 0' }
          }}
        >
          <FontAwesomeIcon icon={faArrowRight} width={16} />
        </Text>
        <Flex
          direction="row"
          css={{
            backgroundColor: 'subtle-background-color',
            p: '12px 16px',
            borderRadius: 12,
            gap: 2,
            width: '100%',
            alignItems: 'center',
            bp500: { flexDirection: 'column', gap: 1, alignItems: 'flex-start' }
          }}
        >
          <ChainTokenIcon
            chainId={toToken?.chainId}
            tokenlogoURI={toToken?.logoURI}
            tokenSymbol={toToken?.symbol}
            css={{ height: 32, width: 32 }}
          />
          <Flex direction="column" align="start" css={{ gap: '1' }}>
            <Text color="subtle" style="subtitle2">
              {toChain?.displayName}
            </Text>
            <Text style="h6" ellipsify css={{ lineHeight: '20px' }}>
              {toAmountFormatted} {toToken?.symbol}
            </Text>
          </Flex>
        </Flex>
      </Flex>
      {formattedGasTopUpAmount ? (
        <Flex
          direction="row"
          justify="between"
          css={{
            backgroundColor: 'subtle-background-color',
            p: '12px 16px',
            borderRadius: 12,
            gap: 2,
            width: '100%',
            alignItems: 'center'
          }}
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
        css={{
          '--borderColor': 'colors.gray3',
          border: '1px solid var(--borderColor)',
          borderRadius: 12,
          px: '3',
          py: '2',
          gap: '1'
        }}
      >
        {formattedSteps.map((step, index) => (
          <Box key={step.id}>
            <StepRow {...step} />

            {index !== formattedSteps.length - 1 && (
              <Box css={{ height: '14px', pl: '12px', marginTop: '4px' }}>
                <Box
                  css={{
                    width: '1px',
                    height: '100%',
                    backgroundColor: 'gray7'
                  }}
                />
              </Box>
            )}
          </Box>
        ))}

        {status === 'delayed' ? (
          <Flex css={{ p: '3', background: 'amber2', borderRadius: 12 }}>
            <Text style="subtitle3" color="warning">
              Your transaction is delayed. We apologize for the inconvenience.
              Contact support if you need help.
            </Text>
          </Flex>
        ) : null}
      </Flex>
    </>
  )
}

type StepIconProps = {
  stepId: string
  isActive: boolean
  chainId?: number
}

const StepIcon = ({ stepId, isActive, chainId }: StepIconProps) => {
  const getIconForStep = () => {
    if (stepId.includes('approve')) {
      return <FileSignature width={14} height={16} />
    }
    if (
      stepId.includes('swap') ||
      stepId.includes('deposit') ||
      stepId.includes('send')
    ) {
      if (stepId.includes('same-chain')) {
        return <Shuffle width={16} height={16} />
      } else {
        return <ArrowRightFromLine width={14} height={16} />
      }
    }
    if (stepId.includes('relay')) {
      return <Shuffle width={16} height={16} />
    }
    if (stepId.includes('receive')) {
      return <ArrowLeftToLine width={14} height={16} />
    }
    return <ChainIcon chainId={chainId} square={false} width={14} height={16} />
  }

  return (
    <Flex
      css={{
        borderRadius: '100px',
        padding: '8px',
        width: '32px',
        height: '32px',
        gap: '2'
      }}
    >
      {getIconForStep()}
    </Flex>
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
  subTextColor?: 'primary11' | 'subtle' | 'slate10'
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
  const hasTxHash = txHashes && txHashes.length > 0

  return (
    <Flex align="center" justify="between" css={{ width: '100%', gap: '3' }}>
      <Flex align="center" css={{ gap: '3', height: 40 }}>
        <Flex
          css={{
            height: 24,
            width: 24,
            borderRadius: 9999999,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isCompleted
              ? 'green3'
              : isActive
                ? 'primary6'
                : 'gray5',
            color: isCompleted ? 'green11' : isActive ? 'primary6' : 'gray9',
            animation:
              isActive && !isCompleted ? 'pulse-shadow 1s infinite' : 'none',
            animationDirection: 'alternate-reverse'
          }}
        >
          {isCompleted ? (
            <FontAwesomeIcon icon={faCheck} width={12} />
          ) : (
            <StepIcon stepId={id} isActive={isActive} chainId={chainId} />
          )}
        </Flex>
        <Flex direction="column" css={{ gap: '2px' }}>
          <Text style="subtitle2" color={isActive ? undefined : 'subtle'}>
            {action}
          </Text>

          {subText && (
            <Flex align="center" css={{ gap: '6px' }}>
              <Text
                style="subtitle3"
                css={{
                  color:
                    subTextColor === 'slate10'
                      ? 'colors.slate.10'
                      : subTextColor === 'subtle'
                        ? 'colors.text-subtle'
                        : 'colors.primary11'
                }}
              >
                {subText}
              </Text>
              {showSubTextSpinner && (
                <LoadingSpinner css={{ height: 12, width: 12 }} />
              )}
            </Flex>
          )}
        </Flex>
      </Flex>
    </Flex>
  )
}
