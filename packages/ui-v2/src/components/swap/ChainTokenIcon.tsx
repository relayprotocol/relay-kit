import * as React from 'react'
import { cn } from '@/lib/utils.js'
import { useIsDarkMode } from '@/hooks/useIsDarkMode.js'

const ASSETS_RELAY_API = 'https://assets.relay.link'

interface ChainTokenIconProps {
  tokenLogoURI?: string
  tokenSymbol?: string
  chainId?: number
  chainIconUrl?: string
  /** Size of the token icon */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: { token: 'h-6 w-6', chain: 'h-3.5 w-3.5' },
  md: { token: 'h-8 w-8', chain: 'h-4 w-4' },
  lg: { token: 'h-10 w-10', chain: 'h-5 w-5' }
} as const

/**
 * Displays a token icon with the chain icon overlaid in the bottom-right corner.
 * Chain icon uses square format from the relay assets CDN.
 * Container uses overflow-visible so the -bottom-0.5 -right-0.5 ring is fully visible.
 */
export const ChainTokenIcon: React.FC<ChainTokenIconProps> = ({
  tokenLogoURI,
  tokenSymbol,
  chainId,
  chainIconUrl,
  size = 'md',
  className
}) => {
  const [tokenError, setTokenError] = React.useState(false)
  const [chainError, setChainError] = React.useState(false)
  const colorMode = useIsDarkMode()

  const { token: tokenSize, chain: chainSize } = SIZES[size]

  // Use light/dark square format for chain icon
  const resolvedChainIcon =
    chainIconUrl ||
    (chainId ? `${ASSETS_RELAY_API}/icons/square/${chainId}/${colorMode}.png` : undefined)

  return (
    <div className={cn('relative shrink-0 overflow-visible', tokenSize, className)}>
      {/* Token icon */}
      {!tokenError && tokenLogoURI ? (
        <img
          src={tokenLogoURI}
          alt=""
          aria-hidden="true"
          className={cn(tokenSize, 'rounded-full object-cover bg-muted')}
          onError={() => setTokenError(true)}
        />
      ) : (
        <div
          className={cn(
            tokenSize,
            'rounded-full bg-muted flex items-center justify-center',
            'text-muted-foreground font-semibold text-xs'
          )}
          aria-hidden="true"
        >
          {tokenSymbol?.charAt(0).toUpperCase() ?? '?'}
        </div>
      )}

      {/* Chain icon — overlaid at bottom-right using square format */}
      {resolvedChainIcon && !chainError && (
        <img
          src={resolvedChainIcon}
          alt=""
          aria-hidden="true"
          className={cn(
            chainSize,
            'absolute -bottom-0.5 -right-0.5',
            'rounded-sm object-cover bg-background',
            'ring-1 ring-background'
          )}
          onError={() => setChainError(true)}
        />
      )}
    </div>
  )
}
