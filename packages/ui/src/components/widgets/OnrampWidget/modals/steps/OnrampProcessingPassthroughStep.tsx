import type { FC } from 'react'
import {
  Anchor,
  Box,
  ChainTokenIcon,
  Flex,
  Text
} from '../../../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons/faUpRightFromSquare'
import type { Token } from '../../../../../types/index.js'
import { LoadingSpinner } from '../../../../common/LoadingSpinner.js'
import MoonPayLogo from '../../../../../img/MoonPayLogo.js'

type OnrampProcessingPassthroughStepProps = {
  toToken: Token
  moonpayTxUrl?: string
  amount?: string
  amountToTokenFormatted?: string
}

export const OnrampProcessingPassthroughStep: FC<
  OnrampProcessingPassthroughStepProps
> = ({ toToken, moonpayTxUrl, amount, amountToTokenFormatted }) => {
  return (
    <Flex
      direction="column"
      css={{
        width: '100%',
        height: '100%'
      }}
    >
      <Text style="h6" css={{ mb: '4' }}>
        Processing Transaction
      </Text>
      <Flex
        align="center"
        css={{
          width: '100%',
          p: '3',
          mb: '2',
          gap: '2',
          background: 'gray2',
          borderRadius: 12
        }}
      >
        <ChainTokenIcon
          chainId={toToken?.chainId}
          tokenlogoURI={toToken?.logoURI}
          tokenSymbol={toToken?.symbol}
          css={{
            width: 32,
            height: 32
          }}
        />
        <Flex align="start" direction="column">
          <Text style="h6">
            {amountToTokenFormatted} {toToken.symbol}
          </Text>
          <Text style="subtitle3" color="subtle">
            {amount}
          </Text>
        </Flex>
      </Flex>
      <Flex
        direction="column"
        justify="center"
        align="center"
        css={{
          py: '4',
          px: '3',
          borderRadius: 'widget-card-border-radius',
          '--borderColor': 'colors.subtle-border-color',
          border: '1px solid var(--borderColor)'
        }}
      >
        <Box css={{ position: 'relative', width: 40, height: 40 }}>
          <MoonPayLogo style={{ borderRadius: 12, width: 40, height: 40 }} />
          <Flex
            align="center"
            justify="center"
            css={{
              width: 24,
              height: 24,
              borderRadius: '100%',
              overflow: 'hidden',
              background: 'primary3',
              position: 'absolute',
              bottom: '-6px',
              right: '-6px',
              '--borderColor': 'colors.modal-background',
              border: '2px solid var(--borderColor)'
            }}
          >
            <LoadingSpinner
              css={{ height: 16, width: 16, fill: 'primary-color' }}
            />
          </Flex>
        </Box>
        <Text style="subtitle2" css={{ mt: '24px', textAlign: 'center' }}>
          Finalizing your purchase through MoonPay, it may take a few minutes to
          process.
        </Text>
        {moonpayTxUrl ? (
          <Anchor
            href={moonpayTxUrl}
            target="_blank"
            css={{ display: 'flex', alignItems: 'center', gap: '1', mt: '2' }}
          >
            Track MoonPay transaction{' '}
            <FontAwesomeIcon icon={faUpRightFromSquare} style={{ width: 14 }} />
          </Anchor>
        ) : null}
      </Flex>
      <Text style="body2" color="subtle" css={{ mt: '2' }}>
        Feel free to leave at any time, MoonPay will email you with updates.
      </Text>
    </Flex>
  )
}
