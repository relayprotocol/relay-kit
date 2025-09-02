import type { FC } from 'react'
import type { Token } from '../../../../types/index.js'
import {
  Button,
  Flex,
  Text,
  Box,
  ChainTokenIcon
} from '../../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import useRelayClient from '../../../../hooks/useRelayClient.js'

type TokenTriggerProps = {
  token?: Token
  locked?: boolean
  address?: string
  testId?: string
}

export const TokenTrigger: FC<TokenTriggerProps> = ({
  token,
  locked,
  address,
  testId
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
        width: 'max-content',
        flexShrink: 0,
        overflow: 'hidden',
        px: '3',
        py: '2',
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
      <Flex align="center" css={{ gap: '2' }}>
        <ChainTokenIcon
          chainId={token.chainId}
          tokenlogoURI={token.logoURI}
          tokenSymbol={token.symbol}
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
            {chain?.displayName}
          </Text>
        </Flex>
      </Flex>
      {locked ? null : (
        <Box css={{ color: 'gray11', width: 14, flexShrink: 0 }}>
          <FontAwesomeIcon icon={faChevronRight} width={14} />
        </Box>
      )}
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
