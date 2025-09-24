import { type FC } from 'react'
import Flex from './Flex.js'
import ChainIcon from './ChainIcon.js'
import Box from './Box.js'
import Text from './Text.js'
import type { Styles } from '@relayprotocol/relay-design-system/css'

type Size = 'sm' | 'base' | 'md' | 'lg'

type ChainTokenProps = {
  chainId?: number
  tokenlogoURI?: string
  tokenSymbol?: string
  css?: Styles
  size?: Size
  successStep?: boolean
}

const SIZES = {
  sm: {
    token: 20,
    chain: 8.333
  },
  base: {
    token: 24,
    chain: 10
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
  successStep = false
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
            borderRadius: successStep ? 6 : 9999,
            overflow: 'hidden'
          }}
        />
      ) : tokenSymbol ? (
        <Box
          css={{
            width: dimensions.token,
            height: dimensions.token,
            borderRadius: successStep ? 6 : '50%',
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
        width={successStep ? 8.33 : dimensions.chain}
        height={successStep ? 8.33 : dimensions.chain}
        borderRadius={successStep ? 1.667 : undefined}
        css={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          borderRadius: successStep ? 1.667 : 4,
          overflow: 'hidden',
          '--borderColor': successStep ? 'white' : 'colors.modal-background',
          border: successStep
            ? '0.833px solid var(--borderColor)'
            : '1px solid var(--borderColor)',
          backgroundColor: successStep ? 'white' : 'modal-background'
        }}
      />
    </Flex>
  ) : null
}
