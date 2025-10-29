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
}

export const BalanceDisplay: FC<BalanceDisplayProps> = ({
  balance,
  decimals,
  symbol,
  isLoading,
  hasInsufficientBalance,
  displaySymbol = true,
  isConnected,
  pending
}) => {
  const compactBalance = Boolean(
    balance && decimals && balance.toString().length - decimals > 4
  )

  if (pending) {
    return (
      <Flex css={{ height: 18 }}>
        <Text style="subtitle3" color={'red'}>
          Balance: pending
        </Text>
      </Flex>
    )
  }

  return (
    <Flex css={{ height: 18 }}>
      {isConnected ? (
        <>
          {isLoading ? (
            <Skeleton css={{ mt: '6px' }} />
          ) : (
            <Text
              style="subtitle3"
              color={hasInsufficientBalance ? 'red' : 'subtleSecondary'}
            >
              Balance:{' '}
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
