import type { FC } from 'react'
import {
  AccessibleListItem,
  Button,
  ChainTokenIcon,
  Flex,
  Text
} from '../../primitives/index.js'
import { useMemo } from 'react'
import { useInternalRelayChains } from '../../../hooks/index.js'
import type { Token } from '../../../types/index.js'

type SuggestedTokensProps = {
  chainId: number
  depositAddressOnly?: boolean
  onSelect: (token: Token) => void
}

export const SuggestedTokens: FC<SuggestedTokensProps> = ({
  chainId,
  depositAddressOnly,
  onSelect
}) => {
  const { chains } = useInternalRelayChains()

  const chain = chains?.find((c) => c.id === chainId)

  const suggestedTokens = useMemo(() => {
    if (!chain?.featuredTokens) return []

    return chain.featuredTokens
      .filter((token) => (depositAddressOnly ? token.supportsBridging : true))
      .map((currency) => {
        return {
          ...currency,
          chainId: Number(chainId),
          verified: true,
          logoURI: currency?.metadata?.logoURI ?? ''
        }
      })
  }, [chain?.featuredTokens, chainId, depositAddressOnly])

  if (!suggestedTokens.length) {
    return null
  }

  return (
    <Flex className="relay:w-full relay:items-center relay:flex-wrap relay:gap-1 relay:my-2">
      {suggestedTokens.map((token, idx) => {
        const tokenSymbol =
          token.chainId === 1337 && token.symbol === 'USDC'
            ? token.name
            : token.symbol

        return (
          <AccessibleListItem
            asChild
            key={`${token.chainId}:${token.address}:${idx}`}
            value={`${token.chainId}:${token.address}`}
          >
            <Button
              onClick={(e) => {
                e.preventDefault()
                onSelect({
                  ...token
                } as Token)
              }}
              color="ghost"
              size="none"
              corners="pill"
              className="relay:flex relay:shrink-0 relay:cursor-pointer relay:outline-none relay:py-1 relay:pl-1 relay:pr-2 relay:gap-1 relay:items-center relay:border relay:border-solid relay:border-[var(--relay-colors-gray5)] relay:focus-inset relay:transition-none"
            >
              <ChainTokenIcon
                chainId={token.chainId}
                tokenlogoURI={token?.metadata?.logoURI}
                tokenSymbol={token.symbol}
              />
              <Text style="h6" ellipsify>
                {tokenSymbol}
              </Text>
            </Button>
          </AccessibleListItem>
        )
      })}
    </Flex>
  )
}
