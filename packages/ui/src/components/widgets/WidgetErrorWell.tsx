import { type Execute } from '@reservoir0x/relay-sdk'
import {
  evmDeadAddress,
  solDeadAddress,
  bitcoinDeadAddress
} from '@reservoir0x/relay-sdk'
import { type FC } from 'react'
import { Box, Flex, Text } from '../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons/faExclamationCircle'
import { type Currency } from '../../constants/currencies.js'
import Tooltip from '../primitives/Tooltip.js'
import { useMediaQuery } from 'usehooks-ts'
import type { Styles } from '@reservoir0x/relay-design-system/css'
import type { QuoteResponse } from '@reservoir0x/relay-kit-hooks'
import type { LinkedWallet } from '../../types/index.js'

type Props = {
  error: any
  hasInsufficientBalance: boolean
  quote?: Partial<Execute> | QuoteResponse
  currency?: Currency
  relayerFeeProportion?: bigint | 0
  isHighRelayerServiceFee?: boolean
  isCapacityExceededError?: boolean
  isCouldNotExecuteError?: boolean
  supportsExternalLiquidity?: boolean
  containerCss?: Styles
  recipientWalletSupportsChain?: boolean | null
  recipient?: string
  toChainWalletVMSupported?: boolean
  recipientLinkedWallet?: LinkedWallet
  toChainVmType?: string
}

export const WidgetErrorWell: FC<Props> = ({
  error,
  hasInsufficientBalance,
  quote,
  currency,
  relayerFeeProportion,
  isHighRelayerServiceFee,
  isCapacityExceededError,
  isCouldNotExecuteError,
  supportsExternalLiquidity,
  containerCss,
  recipientWalletSupportsChain,
  recipient,
  toChainWalletVMSupported,
  recipientLinkedWallet,
  toChainVmType
}) => {
  const isSmallDevice = useMediaQuery('(max-width: 600px)')
  const fetchQuoteErrorMessage = error
    ? error?.response?.data?.message
      ? error?.response?.data.message === 'processing response error'
        ? 'Amount is higher than the available liquidity.'
        : (error?.response?.data.message as string)
      : 'Unknown Error'
    : null
  const isHighPriceImpact = Number(quote?.details?.totalImpact?.percent) < -3.5
  const totalImpactUsd = quote?.details?.totalImpact?.usd
  const showHighPriceImpactWarning =
    isHighPriceImpact && totalImpactUsd && Number(totalImpactUsd) <= -10
  const isInsufficientLiquidityError =
    fetchQuoteErrorMessage?.includes('No quotes found')

  if (isInsufficientLiquidityError) {
    return null
  }

  /*
   * Show wallet incompatibility warning when:
   * • Wallet doesn't support destination chain
   * • Valid recipient address (not dead/burn address)
   * • Destination chain supports wallet's VM type
   * • Wallet VM type matches destination chain VM
   */
  if (
    !recipientWalletSupportsChain &&
    recipient &&
    recipient !== evmDeadAddress &&
    recipient !== solDeadAddress &&
    recipient !== bitcoinDeadAddress &&
    toChainWalletVMSupported &&
    (!recipientLinkedWallet || recipientLinkedWallet.vmType === toChainVmType)
  ) {
    return (
      <Flex
        align="center"
        css={{
          gap: '2',
          p: '3',
          backgroundColor: 'amber2',
          borderRadius: 12,
          mb: '3',
          ...containerCss
        }}
        id={'widget-error-well-section'}
      >
        <Box css={{ color: 'amber9' }}>
          <FontAwesomeIcon icon={faExclamationCircle} width={16} />
        </Box>
        <Text style="subtitle3" css={{ color: 'amber12' }}>
          Your selected wallet doesn't support the destination chain. Please
          choose a different wallet.
        </Text>
      </Flex>
    )
  }

  if (fetchQuoteErrorMessage && !quote) {
    if (isCapacityExceededError && supportsExternalLiquidity && currency) {
      return (
        <Flex
          align="center"
          css={{
            gap: '2',
            p: '3',
            backgroundColor: 'amber2',
            borderRadius: 12,
            mb: '3',
            ...containerCss
          }}
          id={'widget-error-well-section'}
        >
          <Box css={{ color: 'amber9' }}>
            <FontAwesomeIcon icon={faExclamationCircle} width={16} />
          </Box>
          <Text style="subtitle3" css={{ color: 'amber12' }}>
            Due to high demand the input amount can only be bridged natively.
            Reduce the amount to bridge instantly or switch to the native route
            for unlimited capacity.
          </Text>
        </Flex>
      )
    } else if (
      supportsExternalLiquidity &&
      isCouldNotExecuteError &&
      currency
    ) {
      return (
        <Flex
          align="center"
          css={{
            gap: '2',
            p: '3',
            backgroundColor: 'red2',
            borderRadius: 12,
            mb: '3',
            ...containerCss
          }}
          id={'widget-error-well-section'}
        >
          <Box css={{ color: 'red10' }}>
            <FontAwesomeIcon icon={faExclamationCircle} width={16} />
          </Box>
          <Text style="subtitle3" css={{ color: 'red12' }}>
            {fetchQuoteErrorMessage} Please switch to the native route.
          </Text>
        </Flex>
      )
    } else {
      return (
        <Flex
          align="center"
          css={{
            gap: '2',
            p: '3',
            backgroundColor: 'red2',
            borderRadius: 12,
            mb: '3',
            ...containerCss
          }}
          id={'widget-error-well-section'}
        >
          <Box css={{ color: 'red10' }}>
            <FontAwesomeIcon icon={faExclamationCircle} width={16} />
          </Box>
          <Text style="subtitle3" css={{ color: 'red12' }}>
            {fetchQuoteErrorMessage}
          </Text>
        </Flex>
      )
    }
  }

  if (hasInsufficientBalance) {
    return null
  }

  if (relayerFeeProportion && relayerFeeProportion >= 40n) {
    return (
      <Tooltip
        side={isSmallDevice ? 'top' : 'right'}
        content={
          <Text
            style="subtitle3"
            css={{ maxWidth: 215, display: 'inline-block' }}
          >
            We recommend increasing the amount or waiting for the gas fee to be
            lower.
          </Text>
        }
      >
        <Flex
          align="center"
          css={{
            gap: '2',
            py: '3',
            px: '3',
            backgroundColor: 'amber2',
            borderRadius: 12,
            mb: '3',
            ...containerCss
          }}
          id={'widget-error-well-section'}
        >
          <Box css={{ color: 'amber10' }}>
            <FontAwesomeIcon icon={faExclamationCircle} width={16} />
          </Box>
          <Text style="subtitle3" css={{ color: 'amber12' }}>
            Fees exceed 40% of the received amount.
          </Text>
        </Flex>
      </Tooltip>
    )
  }

  if (showHighPriceImpactWarning) {
    return (
      <Flex
        align="center"
        css={{
          gap: '2',
          py: '2',
          px: '3',
          backgroundColor: 'red2',
          borderRadius: 12,
          mb: '3',
          ...containerCss
        }}
        id={'widget-error-well-section'}
      >
        <Box css={{ color: 'red9' }}>
          <FontAwesomeIcon icon={faExclamationCircle} width={16} />
        </Box>
        <Text style="subtitle3" css={{ color: 'amber12' }}>
          The price impact is currently high (
          {quote?.details?.totalImpact?.percent}%).
        </Text>
      </Flex>
    )
  }

  if (isHighRelayerServiceFee) {
    return (
      <Flex
        align="center"
        css={{
          gap: '2',
          py: '3',
          px: '3',
          backgroundColor: 'amber2',
          borderRadius: 12,
          mb: '3',
          ...containerCss
        }}
        id={'widget-error-well-section'}
      >
        <Box css={{ color: 'amber10' }}>
          <FontAwesomeIcon icon={faExclamationCircle} width={16} />
        </Box>
        <Text style="subtitle3" css={{ color: 'amber12' }}>
          Due to high demand, Relayer fees have temporarily been increased.
        </Text>
      </Flex>
    )
  }
  return null
}
