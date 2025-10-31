import type { FC } from 'react'
import type { Token } from '../../../../types/index.js'
import {
  Button,
  Flex,
  Text,
  Box,
  ChainTokenIcon,
  Skeleton
} from '../../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import useRelayClient from '../../../../hooks/useRelayClient.js'
import { useCurrencyBalance } from '../../../../hooks/index.js'
import type { BalanceMap } from '../../../../hooks/useDuneBalances.js'
import { formatDollarCompact, formatBN } from '../../../../utils/numbers.js'
import {
  evmDeadAddress,
  solDeadAddress,
  bitcoinDeadAddress
} from '@relayprotocol/relay-sdk'

type PaymentMethodTriggerProps = {
  token?: Token
  locked?: boolean
  address?: string
  testId?: string
  balanceLabel?: string
  balanceMap?: BalanceMap
  placeholderText?: string
}

const normalizeAddress = (address?: string) => {
  if (
    !address ||
    address === evmDeadAddress ||
    address === solDeadAddress ||
    address === bitcoinDeadAddress
  ) {
    return undefined
  }

  return address.startsWith('0x') ? address.toLowerCase() : address
}

export const PaymentMethodTrigger: FC<PaymentMethodTriggerProps> = ({
  token,
  locked,
  address,
  testId,
  balanceLabel = 'available',
  balanceMap: providedBalanceMap,
  placeholderText = 'Select Token'
}) => {
  const relayClient = useRelayClient()

  // Always use useCurrencyBalance for wallet-specific balance
  const normalizedAddress = normalizeAddress(address)
  const chain = relayClient?.chains?.find((c) => c.id === token?.chainId)

  const {
    value: currencyBalanceValue,
    isLoading: isLoadingCurrencyBalance,
    isDuneBalance,
    error: currencyBalanceError
  } = useCurrencyBalance({
    chain,
    address: normalizedAddress,
    currency: token?.address,
    enabled: Boolean(token && chain && normalizedAddress)
  })

  let balanceUsd: number | undefined
  let hasBalanceUsd = false

  if (isDuneBalance && currencyBalanceValue && token) {
    const balanceKey = `${token.chainId}:${token.address.toLowerCase()}`
    const duneBalance =
      providedBalanceMap?.[balanceKey] ??
      providedBalanceMap?.[`${token?.chainId}:${token?.address}`]
    balanceUsd = duneBalance?.value_usd
    hasBalanceUsd = balanceUsd !== undefined && balanceUsd !== null
  }

  const isBalanceQueryPending = isLoadingCurrencyBalance

  const showSkeleton =
    normalizedAddress &&
    isBalanceQueryPending &&
    !hasBalanceUsd &&
    !currencyBalanceValue

  let balanceText = ''
  if (hasBalanceUsd) {
    balanceText = `${formatDollarCompact(balanceUsd)} ${balanceLabel}`
  } else if (currencyBalanceValue && token) {
    const formattedBalance = formatBN(currencyBalanceValue, 4, token.decimals, false)
    balanceText = `${formattedBalance} ${token.symbol} ${balanceLabel}`
  }

  return token ? (
    <Button
      color="white"
      corners="pill"
      disabled={locked}
      css={{
        height: 50,
        minHeight: 50,
        width: '248px',
        flexShrink: 0,
        overflow: 'hidden',
        borderRadius: '12px',
        padding: '12px',
        backgroundColor: 'widget-selector-background',
        border: 'none',
        _hover: {
          backgroundColor: 'widget-selector-hover-background'
        },
        _disabled: {
          backgroundColor: 'widget-selector-background'
        }
      }}
      data-testid={testId}
    >
      <Flex align="center" justify="between" css={{ width: '100%' }}>
        <Flex align="center" css={{ gap: '2' }}>
          <ChainTokenIcon
            chainId={token.chainId}
            tokenlogoURI={token.logoURI}
            tokenSymbol={token.symbol}
            chainIconSize={14}
            css={{ width: 32, height: 32 }}
          />
          <Flex
            direction="column"
            align="start"
            css={{ maxWidth: 150, minWidth: 60, flex: 1 }}
          >
            <Text style="h6" ellipsify css={{ maxWidth: '100%' }}>
              {token.symbol}
            </Text>
            {showSkeleton ? (
              <Skeleton
                css={{
                  width: 70,
                  height: 12,
                  borderRadius: 4
                }}
              />
            ) : (
              <Text
                style="subtitle3"
                color="subtle"
                css={{
                  lineHeight: '15px',
                  maxWidth: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {balanceText}
              </Text>
            )}
          </Flex>
        </Flex>
        {locked ? null : (
          <Box css={{ color: 'gray9', width: 14, flexShrink: 0 }}>
            <FontAwesomeIcon icon={faChevronRight} width={14} />
          </Box>
        )}
      </Flex>
    </Button>
  ) : (
    <Button
      color={address ? 'primary' : 'secondary'}
      corners="pill"
      cta={true}
      css={{
        height: 50,
        minHeight: 50,
        width: 'max-content',
        flexShrink: 0,
        overflow: 'hidden',
        px: '3',
        py: '2',
        fontWeight: 700,
        fontSize: '16px'
      }}
    >
      {placeholderText}
      <Box css={{ width: 14 }}>
        <FontAwesomeIcon icon={faChevronRight} width={14} />
      </Box>
    </Button>
  )
}
