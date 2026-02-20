import { type FC } from 'react'
import { Button, Flex } from '../primitives/index.js'
import type { ChainVM, RelayChain } from '@relayprotocol/relay-sdk'
import type { PublicClient } from 'viem'
import {
  MAX_INPUT_BUFFER_BPS,
  MIN_INPUT_BUFFER_UNITS
} from '../../constants/maxAmountBuffer.js'
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
  const getExecutionBuffer = (amount: bigint) => {
    if (amount <= 0n) return 0n

    const bpsBuffer = (amount * MAX_INPUT_BUFFER_BPS) / 10000n
    const minimumBuffer =
      amount > MIN_INPUT_BUFFER_UNITS ? MIN_INPUT_BUFFER_UNITS : amount

    return bpsBuffer > minimumBuffer ? bpsBuffer : minimumBuffer
  }

  const isMobile = variant === 'mobile'

  const defaultButtonClassName = cn(
    isMobile ? 'relay-text-[14px]' : 'relay-text-[12px]',
    'relay-font-medium relay-px-1',
    isMobile ? 'relay-py-[6px]' : 'relay-py-1',
    isMobile ? '' : 'relay-min-h-[23px]',
    'relay-leading-none',
    'relay-bg-[var(--relay-colors-widget-selector-background)]',
    'relay-border-none',
    isMobile ? 'relay-rounded-[6px]' : 'relay-rounded-[12px]',
    isMobile ? 'relay-flex-1' : '',
    'relay-justify-center',
    'hover:relay-bg-[var(--relay-colors-widget-selector-hover-background)]'
  )

  const buttonClassName = customButtonClassName || defaultButtonClassName

  const handleMaxClick = async () => {
    if (!balance || !fromChain) return

    const executionBufferAmount = getExecutionBuffer(balance)
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

    const totalBufferAmount = executionBufferAmount + feeBufferAmount
    const finalMaxAmount =
      balance > totalBufferAmount ? balance - totalBufferAmount : 0n

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
        'relay-gap-1',
        isMobile ? 'relay-w-full' : 'relay-w-auto',
        isMobile ? 'relay-mb-1' : 'relay-mb-0'
      )}
    >
      {percentages.map((percent) => (
        <Button
          key={percent}
          aria-label={`${percent}%`}
          className={buttonClassName}
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
        className={buttonClassName}
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
