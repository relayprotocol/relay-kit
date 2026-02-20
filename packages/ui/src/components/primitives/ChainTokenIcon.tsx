import { type FC } from 'react'
import ChainIcon from './ChainIcon.js'
import Text from './Text.js'
import { cn } from '../../utils/cn.js'

type Size = 'sm' | 'base' | 'md' | 'lg'

type ChainTokenProps = {
  chainId?: number
  tokenlogoURI?: string
  tokenSymbol?: string
  className?: string
  size?: Size
  chainRadius?: number
  chainIconSize?: number
}

const SIZES = {
  sm: {
    token: 20,
    chain: 12
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
  className,
  size = 'md',
  chainRadius = 4,
  chainIconSize
}) => {
  const isValidTokenLogo = tokenlogoURI && tokenlogoURI !== 'missing.png'
  const dimensions = SIZES[size]
  const chainSize = chainIconSize ?? dimensions.chain

  return chainId ? (
    <div
      className={cn(
        'relay-relative relay-shrink-0 relay-overflow-hidden',
        className
      )}
      style={{
        width: dimensions.token,
        height: dimensions.token,
        borderRadius: chainRadius
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
        <div
          className="relay-rounded-[50%] relay-bg-[var(--relay-colors-primary4)] relay-text-[color:var(--relay-colors-primary8)] relay-flex relay-items-center relay-justify-center"
          style={{
            width: dimensions.token,
            height: dimensions.token
          }}
        >
          <Text style="h6">{tokenSymbol?.charAt(0).toUpperCase()}</Text>
        </div>
      ) : null}
      <ChainIcon
        chainId={chainId}
        width={chainSize}
        height={chainSize}
        borderRadius={chainRadius}
        className="relay-absolute relay-right-0 relay-bottom-0 relay-overflow-hidden relay-border relay-border-solid relay-border-[var(--relay-colors-modal-background)] relay-bg-[var(--relay-colors-modal-background)]"
      />
    </div>
  ) : null
}
