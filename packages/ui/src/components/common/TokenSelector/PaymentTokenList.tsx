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
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons/faExclamationTriangle'
import { formatBN, formatDollar } from '../../../utils/numbers.js'
import type { EnhancedToken } from '../../../hooks/useEnhancedTokensList.js'
import { cn } from '../../../utils/cn.js'

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
            className="relay:gap-2 relay:py-2 relay:px-0 relay:w-full relay:min-[660px]:px-2"
          >
            <Skeleton
              className="relay:w-[40px] relay:h-[40px] relay:rounded-[50%] relay:shrink-0"
            />
            <Flex direction="column" className="relay:gap-[2px] relay:grow">
              <Skeleton className="relay:w-[60%] relay:h-[16px]" />
              <Skeleton className="relay:w-[40%] relay:h-[16px]" />
            </Flex>
          </Flex>
        ))}
      </>
    )
  }

  if (tokens.length > 0)
    return (
      <Flex direction="column" className="relay:gap-1 relay:w-full">
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
                className="relay:gap-2 relay:cursor-pointer relay:px-0 relay:py-2 relay:transition-[backdrop-filter] relay:duration-[250ms] relay:ease-linear relay:min-[660px]:px-2 relay:hover:bg-[rgba(var(--relay-colors-gray-rgb,0,0,0),0.1)] relay:shrink-0 relay:content-center relay:flex relay:w-full relay:focus-visible:shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)] relay:[&[data-state=on]]:shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)] relay:active:shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)] relay:focus-within:shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)] relay:snap-start"
                style={{ opacity }}
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
                  className="relay:gap-[2px] relay:max-w-full relay:min-w-0"
                >
                  <Flex align="center" className="relay:gap-1 relay:max-w-full">
                    <Text
                      style="h6"
                      ellipsify
                      className="relay:gap-1 relay:items-center"
                    >
                      {token.symbol}
                    </Text>
                    {token.isGasCurrency && chainFilterId && (
                      <Text
                        style="subtitle3"
                        className="relay:px-[6px] relay:py-[4px] relay:rounded-[100px] relay:bg-[var(--relay-colors-gray3)] relay:whitespace-nowrap relay:shrink-0 relay:leading-[12px] relay:[button:hover_&]:bg-[var(--relay-colors-gray5)]"
                      >
                        Gas Token
                      </Text>
                    )}
                  </Flex>
                  <Flex align="center" className="relay:gap-1 relay:max-w-full">
                    <Text style="subtitle3" color="subtle" ellipsify>
                      {token.chain?.displayName ||
                        token.chain?.name ||
                        'Unknown Chain'}
                    </Text>

                    {!token.verified ? (
                      <Box className="relay:text-[color:var(--relay-colors-gray8)]">
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
                    className="relay:gap-[2px] relay:ml-auto relay:shrink-0"
                  >
                    {isLoadingBalances ? (
                      <>
                        <Skeleton className="relay:ml-auto relay:w-[60px]" />
                        <Skeleton className="relay:ml-auto relay:w-[60px]" />
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
            className="relay:ml-auto relay:min-h-[24px] relay:px-2 relay:py-1"
            onClick={() => setTokensExpanded(!tokensExpanded)}
          >
            <Text style="subtitle3" color="subtle">
              {tokensExpanded ? 'Less' : 'More'}
            </Text>
            <Text
              style="body1"
              className={cn(
                'relay:text-[color:var(--relay-colors-gray9)] relay:ml-auto relay:w-[12px]',
                tokensExpanded ? 'relay:rotate-180' : 'relay:rotate-0'
              )}
            >
              <FontAwesomeIcon icon={faChevronDown} />
            </Text>
          </Button>
        )}
      </Flex>
    )
}
