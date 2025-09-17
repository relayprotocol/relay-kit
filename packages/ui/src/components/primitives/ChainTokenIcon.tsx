import { type FC } from 'react'
import Flex from './Flex.js'
import ChainIcon from './ChainIcon.js'
import Box from './Box.js'
import Text from './Text.js'
import type { Styles } from '@relayprotocol/relay-design-system/css'

type Size = 'sm' | 'md' | 'lg'

type ChainTokenProps = {
  chainId?: number
  tokenlogoURI?: string
  tokenSymbol?: string
  css?: Styles
  size?: Size
  chainRadius?: number
}

const SIZES = {
  sm: {
    token: 20,
    chain: 12
  },
  md: {
    token: 32,
    chain: 16
  },
  lg: {
    token: 40,
    chain: 18
  }
} as const

export const ChainTokenIcon: FC<ChainTokenProps> = ({
  chainId,
  tokenlogoURI,
  tokenSymbol,
  css = {},
  size = 'md',
  chainRadius = 4
}) => {
  const isValidTokenLogo = tokenlogoURI && tokenlogoURI !== 'missing.png'
  const dimensions = SIZES[size]

  return chainId ? (
    <Flex
      css={{
        position: 'relative',
        flexShrink: 0,
        width: dimensions.token,
        height: dimensions.token,
        overflow: 'hidden',
        borderRadius: chainRadius,
        ...css
      }}
    >
      {isValidTokenLogo ? (
        <img
          alt={'Token'}
          src={tokenlogoURI}
          width={dimensions.token}
          height={dimensions.token}
          style={{
            borderRadius: 9999,
            overflow: 'hidden'
          }}
        />
      ) : tokenSymbol ? (
        <Box
          css={{
            width: dimensions.token,
            height: dimensions.token,
            borderRadius: '50%',
            backgroundColor: 'primary4',
            color: 'primary8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Text style="h6">{tokenSymbol?.charAt(0).toUpperCase()}</Text>
        </Box>
      ) : null}
      <ChainIcon
        chainId={chainId}
        width={dimensions.chain}
        height={dimensions.chain}
        css={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          borderRadius: chainRadius,
          overflow: 'hidden',
          '--borderColor': 'colors.modal-background',
          border: '1px solid var(--borderColor)',
          backgroundColor: 'modal-background'
        }}
        borderRadius={chainRadius}
      />
    </Flex>
  ) : null
}
