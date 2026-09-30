import { type FC } from 'react'
import { Button, Flex } from '../primitives/index.js'
import type { ChainVM, RelayChain } from '@relayprotocol/relay-sdk'
import type { PublicClient } from 'viem'
import { getMaxAmount } from '../../utils/maxAmount.js'
import { cn } from '../../utils/cn.js'

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
  buttonClassName?: string
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
  buttonClassName: customButtonClassName
}) => {
  const isMobile = variant === 'mobile'

  const defaultButtonClassName = cn(
    'relay:font-medium',
    isMobile ? 'relay:px-[4px] relay:py-[6px]' : 'relay:p-[4px]',
    isMobile ? 'relay:h-[26px]' : 'relay:h-[23px]',
    'relay:min-h-0',
    'relay:leading-none',
    'relay:bg-[var(--relay-colors-widget-selector-background)]',
    'relay:border-none',
    isMobile ? 'relay:rounded-[6px]' : 'relay:rounded-[12px]',
    isMobile ? 'relay:flex-1' : '',
    'relay:justify-center',
    'relay:hover:bg-[var(--relay-colors-widget-selector-hover-background)]',
    'relay:active:bg-[var(--relay-colors-gray5)]'
  )

  const buttonFontSize = isMobile ? '14px' : '12px'

  const buttonClassName = customButtonClassName || defaultButtonClassName

  const handleMaxClick = async () => {
    if (!balance || !fromChain) return

    const supportsNativeGasBuffer =
      fromChain.vmType === 'evm' || fromChain.vmType === 'svm'

    let feeBufferAmount: bigint = 0n
    if (isFromNative && supportsNativeGasBuffer && getFeeBufferAmount) {
      feeBufferAmount = await getFeeBufferAmount(
        fromChain.vmType,
        fromChain.id,
        balance,
        publicClient ?? null
      )
    }

    const finalMaxAmount = getMaxAmount(
      balance,
      !!isFromNative,
      feeBufferAmount
    )

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
      className={cn(
        'relay:gap-1',
        isMobile ? 'relay:w-full' : 'relay:w-auto',
        isMobile ? 'relay:mb-1' : 'relay:mb-0'
      )}
    >
      {percentages.map((percent) => (
        <Button
          key={percent}
          aria-label={`${percent}%`}
          className={buttonClassName}
          color="white"
          size="none"
          style={{ fontSize: buttonFontSize }}
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
        className={buttonClassName}
        color="white"
        size="none"
        style={{ fontSize: buttonFontSize }}
        disabled={!balance || balance === 0n}
        onMouseEnter={handleMaxMouseEnter}
        onClick={handleMaxClick}
      >
        MAX
      </Button>
    </Flex>
  )
}
