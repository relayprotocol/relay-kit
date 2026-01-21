import { type FC } from 'react'
import { Button, Flex } from '../primitives/index.js'
import type { ChainVM, RelayChain } from '@relayprotocol/relay-sdk'
import type { PublicClient } from 'viem'

type PercentageButtonsProps = {
  balance: bigint
  onPercentageClick: (amount: bigint, label: string, feeBuffer?: bigint) => void
  getFeeBufferAmount?: (
    vmType: ChainVM | undefined | null,
    chainId: number | undefined | null,
    balance: bigint,
    publicClient: PublicClient | null
  ) => Promise<bigint>
  fromChain?: RelayChain
  publicClient?: PublicClient | null
  isFromNative?: boolean
  variant?: 'desktop' | 'mobile'
  percentages?: number[]
  buttonStyles?: Record<string, any>
}

export const PercentageButtons: FC<PercentageButtonsProps> = ({
  balance,
  onPercentageClick,
  getFeeBufferAmount,
  fromChain,
  publicClient,
  isFromNative,
  variant = 'desktop',
  percentages = [20, 50],
  buttonStyles: customButtonStyles
}) => {
  const isMobile = variant === 'mobile'

  const defaultButtonStyles = {
    fontSize: isMobile ? 14 : 12,
    fontWeight: '500',
    px: '1',
    py: isMobile ? '6px' : '1',
    minHeight: isMobile ? 'auto' : '23px',
    lineHeight: '100%',
    backgroundColor: 'widget-selector-background',
    border: 'none',
    borderRadius: isMobile ? '6px' : '12px',
    flex: isMobile ? '1' : 'none',
    justifyContent: 'center',
    _hover: {
      backgroundColor: 'widget-selector-hover-background'
    }
  }

  const buttonStyles = customButtonStyles || defaultButtonStyles

  const handleMaxClick = async () => {
    if (!balance || !fromChain) return

    let feeBufferAmount: bigint = 0n
    if (isFromNative && getFeeBufferAmount) {
      feeBufferAmount = await getFeeBufferAmount(
        fromChain.vmType,
        fromChain.id,
        balance,
        publicClient ?? null
      )
    }

    // Reserve gas buffer for native tokens, or use full balance if dust amount
    const finalMaxAmount =
      isFromNative && feeBufferAmount > 0n && balance > feeBufferAmount
        ? balance - feeBufferAmount
        : balance

    onPercentageClick(
      finalMaxAmount,
      'max',
      isFromNative ? feeBufferAmount : 0n
    )
  }

  const handleMaxMouseEnter = () => {
    if (
      fromChain?.vmType === 'evm' &&
      publicClient &&
      balance &&
      getFeeBufferAmount
    ) {
      getFeeBufferAmount(fromChain.vmType, fromChain.id, balance, publicClient)
    } else if (
      fromChain?.vmType === 'svm' &&
      fromChain.id &&
      getFeeBufferAmount
    ) {
      getFeeBufferAmount(fromChain.vmType, fromChain.id, 0n, null)
    }
  }

  return (
    <Flex
      css={{
        gap: '1',
        width: isMobile ? '100%' : 'auto',
        mb: isMobile ? '1' : '0'
      }}
    >
      {percentages.map((percent) => (
        <Button
          key={percent}
          aria-label={`${percent}%`}
          css={buttonStyles}
          color="white"
          disabled={!balance || balance === 0n}
          onClick={() => {
            if (balance && balance > 0n) {
              const percentageBuffer = (balance * BigInt(percent)) / 100n
              onPercentageClick(percentageBuffer, `${percent}%`)
            }
          }}
        >
          {percent}%
        </Button>
      ))}

      <Button
        aria-label="MAX"
        css={buttonStyles}
        color="white"
        disabled={!balance || balance === 0n}
        onMouseEnter={handleMaxMouseEnter}
        onClick={handleMaxClick}
      >
        MAX
      </Button>
    </Flex>
  )
}
