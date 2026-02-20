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
import { formatBN } from '../../../../utils/numbers.js'
import {
  evmDeadAddress,
  solDeadAddress,
  bitcoinDeadAddress
} from '@relayprotocol/relay-sdk'

type PaymentMethodTriggerProps = {
  token?: Token
  address?: string
  testId?: string
  balanceLabel?: string
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
  address,
  testId,
  balanceLabel = 'available',
  placeholderText = 'Select Token'
}) => {
  const relayClient = useRelayClient()

  const normalizedAddress = normalizeAddress(address)
  const chain = relayClient?.chains?.find((c) => c.id === token?.chainId)

  const { value: currencyBalanceValue, isLoading: isLoadingCurrencyBalance } =
    useCurrencyBalance({
      chain,
      address: normalizedAddress,
      currency: token?.address,
      enabled: Boolean(token && chain && normalizedAddress)
    })

  const showSkeleton =
    normalizedAddress && isLoadingCurrencyBalance && !currencyBalanceValue

  let balanceText = ''
  if (currencyBalanceValue && token) {
    const formattedBalance = formatBN(
      currencyBalanceValue,
      4,
      token.decimals,
      false
    )
    balanceText = `${formattedBalance} ${balanceLabel}`
  }

  return token ? (
    <Button
      color="white"
      corners="pill"
      className="relay-h-[50px] relay-min-h-[50px] relay-w-[220px] relay-shrink-0 relay-overflow-hidden relay-rounded-[12px] relay-p-[12px] relay-bg-[var(--relay-colors-widget-selector-background)] relay-border-none hover:relay-bg-[var(--relay-colors-widget-selector-hover-background)]"
      data-testid={testId}
    >
      <Flex align="center" justify="between" className="relay-w-full">
        <Flex align="center" className="relay-gap-2">
          <ChainTokenIcon
            chainId={token.chainId}
            tokenlogoURI={token.logoURI}
            tokenSymbol={token.symbol}
            chainIconSize={14}
            className="relay-w-[32px] relay-h-[32px]"
          />
          <Flex
            direction="column"
            align="start"
            className="relay-max-w-[150px] relay-min-w-[60px] relay-flex-1 relay-gap-[4px]"
          >
            <Text
              style="h6"
              ellipsify
              className="relay-max-w-full relay-leading-normal"
            >
              {token.symbol}
            </Text>
            {showSkeleton ? (
              <Skeleton
                className="relay-w-[70px] relay-h-[12px] relay-rounded-[4px]"
              />
            ) : (
              <Text
                style="subtitle3"
                color="subtle"
                ellipsify
                className="relay-leading-normal relay-max-w-full"
              >
                {balanceText}
              </Text>
            )}
          </Flex>
        </Flex>
        <Box className="relay-text-[color:var(--relay-colors-gray9)] relay-w-[14px] relay-shrink-0">
          <FontAwesomeIcon icon={faChevronRight} width={14} />
        </Box>
      </Flex>
    </Button>
  ) : (
    <Button
      color="white"
      corners="pill"
      className="relay-h-[50px] relay-min-h-[50px] relay-w-[220px] relay-shrink-0 relay-overflow-hidden relay-rounded-[12px] relay-p-[12px] relay-bg-[var(--relay-colors-widget-selector-background)] relay-border-none hover:relay-bg-[var(--relay-colors-widget-selector-hover-background)]"
      data-testid={testId}
    >
      <Flex align="center" justify="between" className="relay-w-full">
        <Text style="h6">Select a token</Text>
        <Box className="relay-text-[color:var(--relay-colors-gray9)] relay-w-[14px] relay-shrink-0">
          <FontAwesomeIcon icon={faChevronRight} width={14} />
        </Box>
      </Flex>
    </Button>
  )
}
