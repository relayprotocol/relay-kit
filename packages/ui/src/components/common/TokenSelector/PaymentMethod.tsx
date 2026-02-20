import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'
import { Flex, Text, Input, Box, Button } from '../../primitives/index.js'
import { Modal } from '../Modal.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass,
  faFolderOpen,
  faChevronLeft
} from '@fortawesome/free-solid-svg-icons'
import type { Token } from '../../../types/index.js'
import { type ChainFilterValue } from './ChainFilter.js'
import useRelayClient from '../../../hooks/useRelayClient.js'
import { type Address } from 'viem'
import { useDebounceState } from '../../../hooks/index.js'
import { useMultiWalletBalances } from '../../../hooks/useMultiWalletBalances.js'
import { useMediaQuery } from 'usehooks-ts'
import { useTokenList } from '@relayprotocol/relay-kit-hooks'
import { EventNames } from '../../../constants/events.js'
import { UnverifiedTokenModal } from '../UnverifiedTokenModal.js'
import { useEnhancedTokensList } from '../../../hooks/useEnhancedTokensList.js'
import { TokenList } from './TokenList.js'
import { UnsupportedDepositAddressChainIds } from '../../../constants/depositAddresses.js'
import { getRelayUiKitData } from '../../../utils/localStorage.js'
import { isValidAddress as isValidAddressUtil } from '../../../utils/address.js'
import {
  AccessibleList,
  AccessibleListItem
} from '../../primitives/AccessibleList.js'
import { eclipse, solana } from '../../../utils/solana.js'
import { bitcoin } from '../../../utils/bitcoin.js'
import { SuggestedTokens } from './SuggestedTokens.js'
import { mergeTokenLists } from '../../../utils/tokens.js'
import { type ChainVM } from '@relayprotocol/relay-sdk'
import {
  getInitialChainFilter,
  sortChains
} from '../../../utils/tokenSelector.js'
import { useInternalRelayChains } from '../../../hooks/index.js'
import { useTrendingCurrencies } from '@relayprotocol/relay-kit-hooks'
import { getStarredChainIds } from '../../../utils/localStorage.js'
import { PaymentTokenList } from './PaymentTokenList.js'
import { CompactChainFilter } from './CompactChainFilter.js'

export type PaymentMethodProps = {
  token?: Token
  trigger: ReactNode
  chainIdsFilter?: number[]
  lockedChainIds?: number[]
  context: 'from' | 'to'
  address?: Address | string
  isValidAddress?: boolean
  multiWalletSupportEnabled?: boolean
  fromChainWalletVMSupported?: boolean
  supportedWalletVMs?: Omit<ChainVM, 'hypevm' | 'lvm'>[]
  popularChainIds?: number[]
  linkedWallets?: any[]
  setToken: (token: Token) => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onPaymentMethodOpenChange?: (open: boolean) => void
}

const PaymentMethod: FC<PaymentMethodProps> = ({
  token,
  trigger,
  chainIdsFilter,
  lockedChainIds,
  context,
  address,
  isValidAddress,
  multiWalletSupportEnabled = false,
  fromChainWalletVMSupported,
  supportedWalletVMs,
  popularChainIds,
  linkedWallets,
  setToken,
  onAnalyticEvent,
  onPaymentMethodOpenChange
}) => {
  const relayClient = useRelayClient()
  const { chains: allRelayChains } = useInternalRelayChains()

  const isDesktop = useMediaQuery('(min-width: 660px)')

  const [open, setOpen] = useState(false)

  const [unverifiedTokenModalOpen, setUnverifiedTokenModalOpen] =
    useState(false)
  const [unverifiedToken, setUnverifiedToken] = useState<Token | undefined>()

  const [chainFilter, setChainFilter] = useState<ChainFilterValue>({
    id: undefined,
    name: 'All Chains'
  })
  const [starredChainIds, setStarredChainIds] = useState<number[] | undefined>(
    () => getStarredChainIds()
  )

  const {
    value: tokenSearchInput,
    debouncedValue: debouncedTokenSearchValue,
    setValue: setTokenSearchInput
  } = useDebounceState<string>('', 500)

  const depositAddressOnly =
    context === 'from'
      ? chainFilter?.vmType
        ? !supportedWalletVMs?.includes(chainFilter.vmType)
        : !chainFilter.id
          ? false
          : !fromChainWalletVMSupported && chainFilter.id === token?.chainId
      : !fromChainWalletVMSupported

  const isReceivingDepositAddress = depositAddressOnly && context === 'to'

  // Configure chains
  const configuredChains = useMemo(() => {
    let chains =
      allRelayChains?.filter((chain) =>
        relayClient?.chains?.find((relayChain) => relayChain.id === chain.id)
      ) ?? []

    if (!multiWalletSupportEnabled && context === 'from') {
      chains = chains.filter((chain) => chain.vmType === 'evm')
    }
    if (isReceivingDepositAddress) {
      chains = chains.filter(
        ({ id }) => !UnsupportedDepositAddressChainIds.includes(id)
      )
    }

    return sortChains(chains)
  }, [
    allRelayChains,
    relayClient?.chains,
    multiWalletSupportEnabled,
    context,
    depositAddressOnly
  ])

  const configuredChainIds = useMemo(() => {
    if (lockedChainIds) {
      return lockedChainIds
    }

    let _chainIds = configuredChains.map((chain) => chain.id)
    if (chainIdsFilter) {
      _chainIds = _chainIds.filter((id) => !chainIdsFilter.includes(id))
    }
    return _chainIds
  }, [configuredChains, lockedChainIds, chainIdsFilter, depositAddressOnly])

  const hasMultipleConfiguredChainIds = configuredChainIds.length > 1

  const chainFilterOptions =
    context === 'from'
      ? configuredChains?.filter(
          (chain) =>
            (chain.vmType === 'evm' ||
              chain.vmType === 'suivm' ||
              chain.vmType === 'tvm' ||
              chain.vmType === 'hypevm' ||
              chain.id === solana.id ||
              chain.id === eclipse.id ||
              chain.id === bitcoin.id) &&
            configuredChainIds.includes(chain.id)
        )
      : configuredChains?.filter((chain) =>
          configuredChainIds.includes(chain.id)
        )

  const allChains = useMemo(
    () => [
      ...(isReceivingDepositAddress
        ? []
        : [{ id: undefined, name: 'All Chains' }]),
      ...chainFilterOptions
    ],
    [isReceivingDepositAddress, chainFilterOptions]
  )

  const useDefaultTokenList = debouncedTokenSearchValue === ''

  const {
    balanceMap: tokenBalances,
    data: duneTokens,
    isLoading: isLoadingBalances
  } = useMultiWalletBalances(
    linkedWallets,
    address,
    relayClient?.baseApiUrl?.includes('testnet') ? 'testnet' : 'mainnet'
  )

  const filteredDuneTokenBalances = useMemo(() => {
    return duneTokens?.balances
  }, [duneTokens?.balances])

  const userTokensQuery = useMemo(() => {
    if (filteredDuneTokenBalances && filteredDuneTokenBalances.length > 0) {
      const sortedBalances = [...filteredDuneTokenBalances]
        .sort((a, b) => {
          const aValue = a.value_usd || 0
          const bValue = b.value_usd || 0
          return bValue - aValue
        })
        .slice(0, 50)

      return sortedBalances.map(
        (balance) => `${balance.chain_id}:${balance.address}`
      )
    }
    return undefined
  }, [filteredDuneTokenBalances])

  const { data: userTokens, isLoading: isLoadingUserTokens } = useTokenList(
    relayClient?.baseApiUrl,
    userTokensQuery
      ? {
          tokens: userTokensQuery,
          limit: 100,
          depositAddressOnly,
          referrer: relayClient?.source
        }
      : undefined,
    {
      enabled: !!filteredDuneTokenBalances
    }
  )

  const isSearchTermValidAddress = isValidAddressUtil(
    chainFilter.vmType,
    debouncedTokenSearchValue,
    chainFilter.id
  )

  const { data: trendingTokens, isLoading: isLoadingTrendingTokens } =
    useTrendingCurrencies(
      relayClient?.baseApiUrl,
      {
        referrer: relayClient?.source
      },
      {
        enabled: context === 'to'
      }
    )

  // Get main token list
  const { data: tokenList, isLoading: isLoadingTokenList } = useTokenList(
    relayClient?.baseApiUrl,
    {
      chainIds: chainFilter.id
        ? [chainFilter.id]
        : configuredChains.map((c) => c.id),
      address: isSearchTermValidAddress ? debouncedTokenSearchValue : undefined,
      term: !isSearchTermValidAddress ? debouncedTokenSearchValue : undefined,
      defaultList: useDefaultTokenList && !depositAddressOnly,
      limit: 12,
      depositAddressOnly,
      referrer: relayClient?.source
    }
  )

  const { data: externalTokenList, isLoading: isLoadingExternalList } =
    useTokenList(
      relayClient?.baseApiUrl,
      {
        chainIds: chainFilter.id
          ? [chainFilter.id]
          : configuredChains.map((c) => c.id),
        address: isSearchTermValidAddress
          ? debouncedTokenSearchValue
          : undefined,
        term: !isSearchTermValidAddress ? debouncedTokenSearchValue : undefined,
        defaultList: false,
        limit: 12,
        useExternalSearch: true,
        referrer: relayClient?.source
      },
      {
        enabled: !!debouncedTokenSearchValue && !depositAddressOnly
      }
    )

  // Merge token lists when searching
  const combinedTokenList = useMemo(() => {
    if (!debouncedTokenSearchValue) return tokenList
    return mergeTokenLists([tokenList, externalTokenList])
  }, [tokenList, externalTokenList, debouncedTokenSearchValue])

  const sortedUserTokens = useEnhancedTokensList(
    userTokens,
    tokenBalances,
    context,
    multiWalletSupportEnabled,
    chainFilter.id,
    true
  )

  const sortedTrendingTokens = useEnhancedTokensList(
    trendingTokens,
    tokenBalances,
    'to',
    multiWalletSupportEnabled,
    undefined,
    false
  )
  const sortedCombinedTokens = useEnhancedTokensList(
    combinedTokenList,
    tokenBalances,
    context,
    multiWalletSupportEnabled,
    chainFilter.id,
    false
  )

  const [chainSearchInputElement, setChainSearchInputElement] =
    useState<HTMLInputElement | null>(null)
  const [tokenSearchInputElement, setTokenSearchInputElement] =
    useState<HTMLInputElement | null>(null)

  const inputElement = hasMultipleConfiguredChainIds
    ? chainSearchInputElement
    : tokenSearchInputElement

  const handleChainStarToggle = useCallback(() => {
    setStarredChainIds(getStarredChainIds())
  }, [])

  useEffect(() => {
    if (open) {
      setStarredChainIds(getStarredChainIds())
    }
  }, [open])

  const resetState = useCallback(() => {
    setTokenSearchInput('')
    setChainSearchInputElement(null)
    setTokenSearchInputElement(null)
  }, [])

  const onOpenChange = useCallback(
    (openChange: boolean) => {
      let tokenCount = undefined
      let usdcCount = 0
      let usdtCount = 0
      let ethCount = 0

      try {
        if (!isLoadingBalances && tokenBalances) {
          tokenCount = Object.keys(tokenBalances).length
          Object.values(tokenBalances).forEach((token) => {
            const tokenSymbol = token.symbol
              ? token.symbol.toLowerCase()
              : token.symbol
            if (tokenSymbol === 'usdc') {
              usdcCount += 1
            } else if (tokenSymbol === 'usdt') {
              usdtCount += 1
            } else if (tokenSymbol === 'eth') {
              ethCount += 1
            }
          })
        }
        onAnalyticEvent?.(
          openChange
            ? EventNames.SWAP_START_TOKEN_SELECT
            : EventNames.SWAP_EXIT_TOKEN_SELECT,
          {
            direction: context === 'from' ? 'input' : 'output',
            ...(!openChange && {
              balanceData: {
                tokenCount,
                usdcCount,
                usdtCount,
                ethCount,
                balanceAddress: address
              }
            })
          }
        )
      } catch (error) {
        console.error(error)
      }

      if (openChange) {
        const chainFilter = getInitialChainFilter(
          chainFilterOptions,
          context,
          depositAddressOnly,
          token,
          true
        )
        setChainFilter(chainFilter)
      }

      setOpen(openChange)
      onPaymentMethodOpenChange?.(openChange)
    },
    [
      tokenBalances,
      isLoadingBalances,
      context,
      address,
      onAnalyticEvent,
      setOpen,
      chainFilterOptions,
      depositAddressOnly,
      token,
      onPaymentMethodOpenChange
    ]
  )

  const handleTokenSelection = useCallback(
    (selectedToken: Token) => {
      const isVerified = selectedToken.verified
      const direction = context === 'from' ? 'input' : 'output'
      let position = undefined

      // Track position for search results
      if (debouncedTokenSearchValue.length > 0) {
        position = sortedCombinedTokens.findIndex(
          (token) =>
            token.chainId === selectedToken.chainId &&
            token.address?.toLowerCase() ===
              selectedToken.address?.toLowerCase()
        )
      }

      if (!isVerified) {
        const relayUiKitData = getRelayUiKitData()
        const tokenKey = `${selectedToken.chainId}:${selectedToken.address}`
        const isAlreadyAccepted =
          relayUiKitData.acceptedUnverifiedTokens.includes(tokenKey)

        if (isAlreadyAccepted) {
          onAnalyticEvent?.(EventNames.SWAP_TOKEN_SELECT, {
            direction,
            token_symbol: selectedToken.symbol,
            chain_id: selectedToken.chainId,
            token_address: selectedToken.address,
            search_term: debouncedTokenSearchValue,
            position
          })
          setToken(selectedToken)
        } else {
          setUnverifiedToken(selectedToken)
          setUnverifiedTokenModalOpen(true)
          return
        }
      } else {
        onAnalyticEvent?.(EventNames.SWAP_TOKEN_SELECT, {
          direction,
          token_symbol: selectedToken.symbol,
          chain_id: selectedToken.chainId,
          token_address: selectedToken.address,
          search_term: debouncedTokenSearchValue,
          position
        })
        setToken(selectedToken)
      }

      onOpenChange(false)
    },
    [
      setToken,
      onOpenChange,
      resetState,
      context,
      onAnalyticEvent,
      debouncedTokenSearchValue,
      sortedCombinedTokens
    ]
  )

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open])

  // Focus input element when modal opens
  useEffect(() => {
    if (open && inputElement && isDesktop) {
      inputElement.focus()
    }
  }, [open, inputElement])

  const paymentMethodContent = (
    <Flex
      direction="column"
      className="relay-w-full relay-h-full relay-gap-3 relay-overflow-y-hidden relay-min-w-0 relay-max-w-full"
    >
      {/* Header with back button */}
      <Flex align="center" className="relay-gap-1">
        <Button
          color="ghost"
          size="none"
          onClick={() => onOpenChange(false)}
          className="relay-py-1 relay-px-0 relay-min-w-[auto] relay-text-[color:var(--relay-colors-gray9)] relay-cursor-pointer relay-rounded-[8px] relay-flex relay-items-center relay-gap-1 focus-visible:relay-shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)] min-[660px]:relay-p-0"
        >
          <FontAwesomeIcon icon={faChevronLeft} width={20} height={20} />
          <Text
            style="subtitle1"
            className="relay-text-[color:var(--relay-colors-text-subtle)] min-[660px]:relay-text-[14px] min-[660px]:relay-text-[color:var(--relay-colors-text-default)] min-[660px]:relay-leading-[20px]"
          >
            {context === 'from' ? 'Pay with' : 'Sell to'}
          </Text>
        </Button>
      </Flex>

      <Flex
        className="relay-flex-1 relay-gap-3 relay-overflow-hidden relay-min-w-0 relay-max-w-full"
      >
        {/* Main Token Content */}
        <AccessibleList
          onSelect={(value) => {
            if (value === 'input') return
            const [chainId, ...addressParts] = value.split(':')
            const address = addressParts.join(':')
            const allTokens = [
              ...sortedUserTokens,
              ...sortedCombinedTokens,
              ...sortedTrendingTokens
            ]

            const selectedToken = allTokens.find(
              (token) =>
                token.chainId === Number(chainId) &&
                token.address?.toLowerCase() === address?.toLowerCase()
            )
            if (selectedToken) {
              handleTokenSelection(selectedToken)
            }
          }}
          className="relay-flex relay-flex-col relay-w-full relay-min-w-0 relay-max-w-full relay-h-full"
        >
          {/* Search Input Section - Fixed */}
          <Flex
            direction="column"
            align="start"
            className="relay-w-full relay-gap-2 relay-bg-[var(--relay-colors-modal-background)] relay-min-w-0 relay-max-w-full"
          >
            {/* Search input and Chain Filter Button Row */}
            <Flex
              align="center"
              className="relay-w-full relay-gap-2 relay-min-w-0 relay-items-center relay-h-[40px]"
            >
              <AccessibleListItem
                value="input"
                asChild
                className="relay-flex-1 relay-min-w-0 relay-flex relay-items-center"
              >
                <Input
                  ref={setTokenSearchInputElement}
                  placeholder="Search for a token"
                  icon={
                    <Box className="relay-text-[color:var(--relay-colors-gray9)]">
                      <FontAwesomeIcon
                        icon={faMagnifyingGlass}
                        width={16}
                        height={16}
                      />
                    </Box>
                  }
                  containerClassName="relay-w-full relay-h-[40px]"
                  className="relay-w-full [&::placeholder]:relay-text-ellipsis"
                  onChange={(e) => {
                    const value = (e.target as HTMLInputElement).value

                    setTokenSearchInput(value)

                    if (isValidAddressUtil(chainFilter.vmType, value)) {
                      onAnalyticEvent?.(
                        EventNames.TOKEN_SELECTOR_CONTRACT_SEARCH,
                        {
                          search_term: value,
                          chain_filter: chainFilter.id
                        }
                      )
                    }
                  }}
                />
              </AccessibleListItem>

              {/* Chain Filter - Compact button with dropdown */}
              {(!configuredChainIds || hasMultipleConfiguredChainIds) && (
                <CompactChainFilter
                  options={allChains}
                  value={chainFilter}
                  onSelect={setChainFilter}
                  popularChainIds={popularChainIds}
                  onChainStarToggle={handleChainStarToggle}
                  starredChainIds={starredChainIds}
                  onAnalyticEvent={onAnalyticEvent}
                />
              )}
            </Flex>
          </Flex>

          {/* Token Lists Section  */}
          <Flex
            key={chainFilter.id ?? 'all'}
            direction="column"
            className="relay-flex-1 relay-overflow-y-auto relay-gap-3 relay-pt-2 relay-min-w-0 relay-max-w-full"
            style={{ scrollbarColor: 'var(--relay-colors-gray5) transparent' }}
          >
            {/* Suggested Tokens */}
            {chainFilter.id &&
            tokenSearchInput.length === 0 &&
            !depositAddressOnly ? (
              <SuggestedTokens
                chainId={chainFilter.id}
                depositAddressOnly={depositAddressOnly}
                onSelect={(token) => {
                  handleTokenSelection(token)
                }}
              />
            ) : null}

            {/* Token Lists */}
            {tokenSearchInput.length > 0 ? (
              <TokenList
                title="Results"
                tokens={sortedCombinedTokens}
                isLoading={
                  isLoadingTokenList ||
                  tokenSearchInput !== debouncedTokenSearchValue
                }
                isLoadingBalances={isLoadingBalances}
                chainFilterId={chainFilter.id}
              />
            ) : chainFilter.id ? (
              <TokenList
                title="Tokens"
                tokens={sortedCombinedTokens}
                isLoading={isLoadingTokenList}
                isLoadingBalances={isLoadingBalances}
                chainFilterId={chainFilter.id}
              />
            ) : (
              <Flex direction="column" className="relay-gap-3">
                {(() => {
                  const hasLoadedBalanceData = Boolean(duneTokens)
                  const userTokensReady = !isLoadingUserTokens
                  const isWaitingForBalanceData =
                    address &&
                    (isLoadingBalances || isLoadingUserTokens) &&
                    (!hasLoadedBalanceData || !userTokensReady)

                  if (isWaitingForBalanceData) {
                    return (
                      <PaymentTokenList
                        title="Recommended"
                        tokens={[]}
                        isLoading={true}
                        isLoadingBalances={false}
                        chainFilterId={chainFilter.id}
                        limit={10}
                      />
                    )
                  }

                  const tokensWithValue =
                    address && hasLoadedBalanceData && userTokensReady
                      ? sortedUserTokens.filter(
                          (token) =>
                            token.balance?.value_usd &&
                            token.balance.value_usd > 0
                        )
                      : []

                  const fallbackTokens =
                    context === 'to' && sortedTrendingTokens.length > 0
                      ? sortedTrendingTokens
                      : sortedCombinedTokens

                  const isTrendingTokens =
                    context === 'to' && sortedTrendingTokens.length > 0
                  const shouldShowBalanceLoading =
                    isLoadingBalances && Boolean(address)

                  return (
                    <>
                      {tokensWithValue.length > 0 ? (
                        <PaymentTokenList
                          title="Recommended"
                          tokens={tokensWithValue}
                          isLoading={false}
                          isLoadingBalances={shouldShowBalanceLoading}
                          chainFilterId={chainFilter.id}
                          limit={tokensWithValue.length}
                        />
                      ) : null}
                      <PaymentTokenList
                        title={isTrendingTokens ? 'Global 24h' : 'Other Tokens'}
                        tokens={fallbackTokens.slice(0, 10)}
                        isLoading={
                          context === 'to'
                            ? isLoadingTrendingTokens
                            : isLoadingTokenList
                        }
                        isLoadingBalances={shouldShowBalanceLoading}
                        chainFilterId={chainFilter.id}
                        limit={10}
                      />
                    </>
                  )
                })()}
              </Flex>
            )}

            {/* Empty State */}
            {!isLoadingTokenList &&
            !isLoadingExternalList &&
            tokenList?.length === 0 &&
            externalTokenList?.length === 0 ? (
              <Flex
                direction="column"
                align="center"
                className="relay-py-5 relay-max-w-[312px] relay-self-center"
              >
                {!chainFilter?.id && isSearchTermValidAddress && (
                  <Box className="relay-text-[color:var(--relay-colors-gray8)] relay-mb-2">
                    <FontAwesomeIcon
                      icon={faFolderOpen}
                      size="xl"
                      width={27}
                      height={24}
                    />
                  </Box>
                )}
                <Text
                  color="subtle"
                  style="body2"
                  className="relay-text-center"
                >
                  {!chainFilter?.id && isSearchTermValidAddress
                    ? 'No results. Switch to the desired chain to search by contract.'
                    : 'No results.'}
                </Text>
              </Flex>
            ) : null}
          </Flex>
        </AccessibleList>
      </Flex>
    </Flex>
  )

  return (
    <>
      {/* Mobile: Overlay */}
      {!isDesktop && (
        <>
          <div onClick={() => onOpenChange(true)}>{trigger}</div>
          {open && (
            <Box
              className="relay-absolute relay-top-0 relay-left-0 relay-right-0 relay-bottom-0 relay-z-[100] relay-bg-[var(--relay-colors-widget-background)] relay-flex relay-flex-col relay-overflow-hidden"
            >
              {paymentMethodContent}
            </Box>
          )}
        </>
      )}

      {/* Desktop: Modal */}
      {isDesktop && (
        <Modal
          open={open}
          onOpenChange={onOpenChange}
          showCloseButton={false}
          trigger={trigger}
          className="relay-p-4 relay-flex relay-flex-col relay-min-w-0 relay-box-border"
          contentStyle={{
            height: 'min(85vh, 540px)',
            width: 'min(400px, 100vw)',
            maxWidth: 'min(400px, 100vw)'
          }}
        >
          {paymentMethodContent}
        </Modal>
      )}

      {unverifiedTokenModalOpen && (
        <UnverifiedTokenModal
          open={unverifiedTokenModalOpen}
          onOpenChange={setUnverifiedTokenModalOpen}
          data={unverifiedToken ? { token: unverifiedToken } : undefined}
          onAcceptToken={(token) => {
            if (token) {
              handleTokenSelection(token)
            }
            setUnverifiedTokenModalOpen(false)
          }}
        />
      )}
    </>
  )
}

export default PaymentMethod
