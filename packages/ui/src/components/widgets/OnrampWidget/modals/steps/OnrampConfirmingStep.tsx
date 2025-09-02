import type { FC } from 'react'
import {
  Anchor,
  Box,
  Button,
  ChainTokenIcon,
  Flex,
  Text
} from '../../../../primitives/index.js'
import type { Token } from '../../../../../types/index.js'
import { OnrampStep } from '../OnrampModal.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import { LoadingSpinner } from '../../../../common/LoadingSpinner.js'
import { EventNames } from '../../../../../constants/events.js'

type OnrampConfirmingStepProps = {
  toToken: Token
  fromToken: Token
  fromChain?: RelayChain
  toChain?: RelayChain
  requestId?: string
  depositAddress?: string
  recipient?: string
  amount?: string
  totalAmount?: string
  ethTotalAmount?: string
  isFetchingQuote?: boolean
  onAnalyticEvent?: (eventName: string, data?: any) => void
  setStep: (step: OnrampStep) => void
}

export const OnrampConfirmingStep: FC<OnrampConfirmingStepProps> = ({
  toToken,
  fromToken,
  fromChain,
  toChain,
  requestId,
  depositAddress,
  recipient,
  amount,
  totalAmount,
  ethTotalAmount,
  isFetchingQuote,
  onAnalyticEvent,
  setStep
}) => {
  return (
    <Flex
      direction="column"
      css={{
        width: '100%',
        height: '100%',
        gap: '4'
      }}
    >
      <Text style="h6">
        Buy {toToken?.symbol} ({toChain?.displayName})
      </Text>
      <Flex
        direction="column"
        css={{
          width: '100%',
          overflow: 'hidden',
          borderRadius: 'widget-card-border-radius',
          '--borderColor': 'colors.subtle-border-color',
          border: '1px solid var(--borderColor)',
          p: '4'
        }}
      >
        <Flex align="center" css={{ gap: '2' }}>
          <ChainTokenIcon
            chainId={fromToken?.chainId}
            tokenlogoURI={fromToken?.logoURI}
            tokenSymbol={fromToken?.symbol}
          />
          <Text style="subtitle1">
            You'll purchase {fromToken?.symbol} ({fromChain?.displayName}) via
            your card
          </Text>
        </Flex>
        <Box
          css={{
            height: 24,
            width: 1,
            background: 'gray5',
            my: '5px',
            ml: 4
          }}
        />
        <Flex align="center" css={{ gap: '2' }}>
          <ChainTokenIcon
            chainId={toToken?.chainId}
            tokenlogoURI={toToken?.logoURI}
            tokenSymbol={toToken?.symbol}
          />
          <Text style="subtitle1">
            Relay converts to {toToken?.symbol} ({toChain?.displayName})
          </Text>
        </Flex>
      </Flex>
      <Text style="subtitle2">
        This transaction occurs in two steps. MoonPay powers only your purchase
        of {fromToken?.symbol} ({fromChain?.displayName}) which Relay then
        converts to {toToken?.symbol} ({toChain?.displayName}).{' '}
        <Anchor
          href="https://support.relay.link/en/articles/10517947-fiat-on-ramps"
          target="_blank"
          css={{ ml: '1' }}
        >
          Learn more
        </Anchor>
      </Text>
      <Button
        cta={true}
        disabled={!depositAddress || isFetchingQuote}
        css={{ justifyContent: 'center' }}
        onClick={(e) => {
          onAnalyticEvent?.(EventNames.ONRAMP_CTA_CLICKED, {
            recipient,
            depositAddress,
            requestId,
            amount,
            totalAmount,
            ethTotalAmount,
            toToken: toToken.address,
            toChain: toToken.chainId
          })
          setStep(OnrampStep.Moonpay)
        }}
      >
        {!depositAddress || isFetchingQuote ? (
          <LoadingSpinner
            css={{ height: 16, width: 16, fill: 'button-disabled-color' }}
          />
        ) : (
          `Purchase ${fromToken?.symbol} (${fromChain?.displayName})`
        )}
      </Button>
    </Flex>
  )
}
