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
      className="relay-h-[50px] relay-min-h-[50px] relay-w-max relay-shrink-0 relay-overflow-hidden relay-px-3 relay-py-2 relay-bg-[var(--relay-colors-widget-selector-background)] relay-border-none hover:relay-bg-[var(--relay-colors-widget-selector-hover-background)] disabled:relay-bg-[var(--relay-colors-widget-selector-background)]"
      data-testid={testId}
    >
      <Flex align="center" className="relay-gap-2">
        <ChainTokenIcon
          chainId={token.chainId}
          tokenlogoURI={token.logoURI}
          tokenSymbol={token.symbol}
          className="relay-w-[32px] relay-h-[32px]"
        />
        <Flex
          direction="column"
          align="start"
          className="relay-max-w-[100px] relay-min-w-[60px]"
        >
          <Text style="h6" ellipsify className="relay-max-w-full">
            {token.symbol}
          </Text>
          <Text
            style="subtitle3"
            ellipsify
            color="subtle"
            className="relay-leading-[15px] relay-max-w-full"
          >
            {chain?.displayName}
          </Text>
        </Flex>
      </Flex>
      {locked ? null : (
        <Box className="relay-text-[color:var(--relay-colors-gray11)] relay-w-[14px] relay-shrink-0">
          <FontAwesomeIcon icon={faChevronRight} width={14} />
        </Box>
      )}
    </Button>
  ) : (
    <Button
      color={address ? 'primary' : 'secondary'}
      corners="pill"
      cta={true}
      className="relay-h-[50px] relay-min-h-[50px] relay-w-max relay-shrink-0 relay-overflow-hidden relay-px-3 relay-py-2 relay-font-bold relay-text-[16px]"
    >
      Select Token
      <Box className="relay-w-[14px]">
        <FontAwesomeIcon icon={faChevronRight} width={14} />
      </Box>
    </Button>
  )
}
