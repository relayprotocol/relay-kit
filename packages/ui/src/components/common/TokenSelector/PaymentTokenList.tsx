import { useState, type FC } from 'react'
import {
  Flex,
  Text,
  Skeleton,
  ChainTokenIcon,
  AccessibleListItem,
  Box,
  Button
} from '../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronDown,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons'
import { formatBN, formatDollar } from '../../../utils/numbers.js'
import type { EnhancedToken } from '../../../hooks/useEnhancedTokensList.js'

type PaymentTokenListProps = {
  title: string
  tokens: EnhancedToken[]
  isLoading: boolean
  isLoadingBalances?: boolean
  chainFilterId?: number
  showMoreButton?: boolean
  limit?: number
  opacity?: number
}

export const PaymentTokenList: FC<PaymentTokenListProps> = ({
  title,
  tokens: rawTokens,
  isLoading,
  isLoadingBalances,
  chainFilterId,
  showMoreButton,
  limit = 5,
  opacity = 1
}) => {
  const [tokensExpanded, setTokensExpanded] = useState(false)
  const tokens =
    showMoreButton && rawTokens && rawTokens.length > limit && !tokensExpanded
      ? rawTokens.slice(0, limit)
      : rawTokens.slice(0, limit)

  if (isLoading) {
    return (
      <>
        {Array.from({ length: 10 }).map((_, index) => (
          <Flex
            key={index}
            align="center"
            css={{ gap: '2', p: '2', width: '100%' }}
          >
            <Skeleton
              css={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                flexShrink: 0
              }}
            />
            <Flex direction="column" css={{ gap: '2px', flexGrow: 1 }}>
              <Skeleton css={{ width: '60%', height: 16 }} />
              <Skeleton css={{ width: '40%', height: 16 }} />
            </Flex>
          </Flex>
        ))}
      </>
    )
  }

  if (tokens.length > 0)
    return (
      <Flex direction="column" css={{ gap: '1', width: '100%' }}>
        <Text style="subtitle2" color="subtle">
          {title}
        </Text>
        {tokens.map((token) => {
          const value = `${token.chainId}:${token.address}`
          const compactBalance = Boolean(
            token.balance &&
              token.decimals &&
              token.balance.toString().length - token.decimals > 4
          )

          return (
            <AccessibleListItem value={value} key={value} asChild>
              <Button
                color="ghost"
                css={{
                  gap: '2',
                  cursor: 'pointer',
                  px: '2',
                  py: '2',
                  transition: 'backdrop-filter 250ms linear',
                  _hover: {
                    backgroundColor: 'gray/10'
                  },
                  flexShrink: 0,
                  alignContent: 'center',
                  display: 'flex',
                  width: '100%',
                  '--focusColor': 'colors.focus-color',
                  _focusVisible: {
                    boxShadow: 'inset 0 0 0 2px var(--focusColor)'
                  },
                  '&[data-state="on"]': {
                    boxShadow: 'inset 0 0 0 2px var(--focusColor)'
                  },
                  _active: {
                    boxShadow: 'inset 0 0 0 2px var(--focusColor)'
                  },
                  _focusWithin: {
                    boxShadow: 'inset 0 0 0 2px var(--focusColor)'
                  },
                  scrollSnapAlign: 'start',
                  opacity
                }}
              >
                <ChainTokenIcon
                  chainId={token.chainId}
                  tokenlogoURI={token.logoURI}
                  tokenSymbol={token.symbol}
                  size="lg"
                />
                <Flex
                  direction="column"
                  align="start"
                  css={{ gap: '2px', maxWidth: '100%', minWidth: 0 }}
                >
                  <Flex align="center" css={{ gap: '1', maxWidth: '100%' }}>
                    <Text
                      style="h6"
                      ellipsify
                      css={{
                        gap: '1',
                        alignItems: 'center'
                      }}
                    >
                      {token.symbol}
                    </Text>
                    {token.isGasCurrency && chainFilterId && (
                      <Text
                        style="subtitle3"
                        css={{
                          px: '6px',
                          py: '4px',
                          borderRadius: '100px',
                          backgroundColor: 'gray3',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          lineHeight: '12px',
                          'button:hover &': {
                            backgroundColor: 'gray5'
                          }
                        }}
                      >
                        Gas Token
                      </Text>
                    )}
                  </Flex>
                  <Flex align="center" css={{ gap: '1', maxWidth: '100%' }}>
                    <Text style="subtitle3" color="subtle" ellipsify>
                      {token.chain?.displayName ||
                        token.chain?.name ||
                        'Unknown Chain'}
                    </Text>

                    {!token.verified ? (
                      <Box css={{ color: 'gray8' }}>
                        <FontAwesomeIcon
                          icon={faExclamationTriangle}
                          width={14}
                          height={14}
                        />
                      </Box>
                    ) : null}
                  </Flex>
                </Flex>

                {(token.balance || isLoadingBalances) && (
                  <Flex
                    direction="column"
                    align="end"
                    css={{ gap: '2px', ml: 'auto', flexShrink: 0 }}
                  >
                    {isLoadingBalances ? (
                      <>
                        <Skeleton css={{ ml: 'auto', width: 60 }} />
                        <Skeleton css={{ ml: 'auto', width: 60 }} />
                      </>
                    ) : (
                      <>
                        {token.balance?.value_usd &&
                          token.balance.value_usd > 0 && (
                            <Text style="h6">
                              {formatDollar(token.balance?.value_usd)}
                            </Text>
                          )}

                        <Text style="subtitle3" color="subtle">
                          {formatBN(
                            token.balance!.amount,
                            4,
                            token.decimals,
                            compactBalance
                          )}
                        </Text>
                      </>
                    )}
                  </Flex>
                )}
              </Button>
            </AccessibleListItem>
          )
        })}
        {showMoreButton && (
          <Button
            color="grey"
            size="small"
            corners="pill"
            css={{ ml: 'auto', minHeight: 24, px: '2', py: '1' }}
            onClick={() => setTokensExpanded(!tokensExpanded)}
          >
            <Text style="subtitle3" color="subtle">
              {tokensExpanded ? 'Less' : 'More'}
            </Text>
            <Text
              style="body1"
              css={{
                color: 'gray9',
                marginLeft: 'auto',
                transform: tokensExpanded ? 'rotate(180deg)' : 'rotate(0)',
                width: 12
              }}
            >
              <FontAwesomeIcon icon={faChevronDown} />
            </Text>
          </Button>
        )}
      </Flex>
    )
}
