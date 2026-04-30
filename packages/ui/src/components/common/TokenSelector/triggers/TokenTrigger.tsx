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
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight'
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
      size="none"
      disabled={locked}
      className="relay:w-max relay:h-[50px] relay:shrink-0 relay:overflow-hidden relay:px-3 relay:bg-[var(--relay-colors-widget-selector-background)] relay:border-none relay:hover:bg-[var(--relay-colors-widget-selector-hover-background)] relay:disabled:bg-[var(--relay-colors-widget-selector-background)] relay:transition-colors relay:duration-150"
      data-testid={testId}
    >
      <Flex align="center" className="relay:gap-2">
        <ChainTokenIcon
          chainId={token.chainId}
          tokenlogoURI={token.logoURI}
          tokenSymbol={token.symbol}
          className="relay:w-[32px] relay:h-[32px]"
        />
        <Flex
          direction="column"
          align="start"
          className="relay:max-w-[100px] relay:min-w-[60px]"
        >
          <Text style="h6" ellipsify className="relay:max-w-full">
            {token.symbol}
          </Text>
          <Text
            style="subtitle3"
            ellipsify
            color="subtle"
            className="relay:leading-[15px] relay:max-w-full"
          >
            {chain?.displayName}
          </Text>
        </Flex>
      </Flex>
      {locked ? null : (
        <Box className="relay:text-[color:var(--relay-colors-gray9)] relay:w-[14px] relay:shrink-0">
          <FontAwesomeIcon icon={faChevronRight} width={14} />
        </Box>
      )}
    </Button>
  ) : (
    <Button
      color={address ? 'primary' : 'secondary'}
      corners="pill"
      size="none"
      cta={true}
      className="relay:w-max relay:h-[50px] relay:shrink-0 relay:overflow-hidden relay:px-3 relay:font-bold relay:text-[16px]"
    >
      Select Token
      <Box className="relay:w-[14px]">
        <FontAwesomeIcon icon={faChevronRight} width={14} />
      </Box>
    </Button>
  )
}
