import type { FC } from 'react'
import type { Token } from '../../../types/index.js'
import {
  Button,
  Flex,
  Text,
  Box,
  ChainTokenIcon
} from '../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import useRelayClient from '../../../hooks/useRelayClient.js'

type TokenWidgetTriggerProps = {
  token?: Token
  locked?: boolean
  address?: string
  testId?: string
  balanceLabel?: string
}

export const TokenWidgetTrigger: FC<TokenWidgetTriggerProps> = ({
  token,
  locked,
  address,
  testId,
  balanceLabel = 'available'
}) => {
  const relayClient = useRelayClient()
  const chain = relayClient?.chains?.find(
    (chain) => chain.id === token?.chainId
  )
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
            css={{ maxWidth: 100, minWidth: 60 }}
          >
            <Text style="h6" ellipsify css={{ maxWidth: '100%' }}>
              {token.symbol}
            </Text>
            <Text
              style="subtitle3"
              ellipsify
              color="subtle"
              css={{ lineHeight: '15px', maxWidth: '100%' }}
            >
              $1000 {balanceLabel}
            </Text>
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
      Select Token
      <Box css={{ width: 14 }}>
        <FontAwesomeIcon icon={faChevronRight} width={14} />
      </Box>
    </Button>
  )
}
