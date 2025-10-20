import type { FC } from 'react'
import { Flex, Skeleton, Text } from '../primitives/index.js'
import { formatBN } from '../../utils/numbers.js'

type BalanceDisplayProps = {
  balance?: bigint
  decimals?: number
  symbol?: string
  isLoading: boolean
  hasInsufficientBalance?: boolean
  displaySymbol?: boolean
  isConnected?: boolean
  pending?: boolean
  hideBalanceLabel?: boolean
  size?: 'sm' | 'md'
}

export const BalanceDisplay: FC<BalanceDisplayProps> = ({
  balance,
  decimals,
  symbol,
  isLoading,
  hasInsufficientBalance,
  displaySymbol = true,
  isConnected,
  pending,
  hideBalanceLabel = false,
  size = 'sm'
}) => {
  const compactBalance = Boolean(
    balance && decimals && balance.toString().length - decimals > 4
  )

  const textStyle = size === 'md' ? 'subtitle2' : 'subtitle3'

  if (pending) {
    return (
      <Flex align="center" css={{ height: 18 }}>
        <Text style={textStyle} color={'red'}>
          {hideBalanceLabel ? 'pending' : 'Balance: pending'}
        </Text>
      </Flex>
    )
  }

  return (
    <Flex align="center" css={{ height: 18 }}>
      {isConnected ? (
        <>
          {isLoading ? (
            <Skeleton />
          ) : (
            <Text
              style={textStyle}
              color={hasInsufficientBalance ? 'red' : 'subtleSecondary'}
            >
              {hideBalanceLabel ? '' : 'Balance: '}
              {balance !== undefined
                ? formatBN(balance ?? 0n, 5, decimals, compactBalance) +
                  (displaySymbol && symbol ? ` ${symbol}` : '')
                : '-'}{' '}
            </Text>
          )}
        </>
      ) : null}
    </Flex>
  )
}
