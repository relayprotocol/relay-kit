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
  publicClient?: PublicClient
  isFromNative?: boolean
  variant?: 'desktop' | 'mobile'
}

export const PercentageButtons: FC<PercentageButtonsProps> = ({
  balance,
  onPercentageClick,
  getFeeBufferAmount,
  fromChain,
  publicClient,
  isFromNative,
  variant = 'desktop'
}) => {
  const isMobile = variant === 'mobile'

  const buttonStyles = {
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

    const finalMaxAmount =
      isFromNative && feeBufferAmount > 0n
        ? balance > feeBufferAmount
          ? balance - feeBufferAmount
          : 0n
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
      <Button
        aria-label="20%"
        css={buttonStyles}
        color="white"
        onClick={() => {
          const percentageBuffer = (balance * 20n) / 100n
          onPercentageClick(percentageBuffer, '20%')
        }}
      >
        20%
      </Button>

      <Button
        aria-label="50%"
        css={buttonStyles}
        color="white"
        onClick={() => {
          const percentageBuffer = (balance * 50n) / 100n
          onPercentageClick(percentageBuffer, '50%')
        }}
      >
        50%
      </Button>

      <Button
        aria-label="MAX"
        css={buttonStyles}
        color="white"
        onMouseEnter={handleMaxMouseEnter}
        onClick={handleMaxClick}
      >
        MAX
      </Button>
    </Flex>
  )
}
