import {
  Children,
  cloneElement,
  isValidElement,
  type FC,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  Flex,
  Text,
  Input,
  Box,
  Button,
  ChainIcon
} from '../../primitives/index.js'
import { Modal } from '../Modal.js'
import { Dropdown, DropdownMenuItem } from '../../primitives/Dropdown.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass,
  faFolderOpen,
  faChevronLeft,
  faChevronDown,
  faStar
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
import AllChainsLogo from '../../../img/AllChainsLogo.js'
import { TagPill } from './TagPill.js'
import Fuse from 'fuse.js'
import {
  isChainStarred,
  toggleStarredChain
} from '../../../utils/localStorage.js'
import { mergeTokenLists } from '../../../utils/tokens.js'
import { type ChainVM } from '@relayprotocol/relay-sdk'
import {
  getInitialChainFilter,
  sortChains,
  groupChains
} from '../../../utils/tokenSelector.js'
import { useInternalRelayChains } from '../../../hooks/index.js'
import { useTrendingCurrencies } from '@relayprotocol/relay-kit-hooks'
import { getStarredChainIds } from '../../../utils/localStorage.js'
import { PaymentTokenList } from './PaymentTokenList.js'
import { PaymentMethodTrigger } from './triggers/PaymentMethodTrigger.js'

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
  supportedWalletVMs?: Omit<ChainVM, 'hypevm'>[]
  popularChainIds?: number[]
  linkedWallets?: any[]
  setToken: (token: Token) => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  autoSelectToken?: boolean
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
  autoSelectToken = true
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
    [isReceivingDepositAddress, chainFilterOptions, starredChainIds]
  )

  const useDefaultTokenList = debouncedTokenSearchValue === ''

  // Fetch balances for all linked wallets
  const {
    balanceMap: tokenBalances,
    data: duneTokens,
    isLoading: isLoadingBalances
  } = useMultiWalletBalances(
    linkedWallets,
    address,
    isValidAddress,
    relayClient?.baseApiUrl?.includes('testnet') ? 'testnet' : 'mainnet'
  )

  // Filter dune token balances based on configured chains
  const filteredDuneTokenBalances = useMemo(() => {
    return duneTokens?.balances?.filter((balance) =>
      configuredChainIds.includes(balance.chain_id)
    )
  }, [duneTokens?.balances, configuredChainIds])

  const userTokensQuery = useMemo(() => {
    if (filteredDuneTokenBalances && filteredDuneTokenBalances.length > 0) {
      return filteredDuneTokenBalances.map(
        (balance) => `${balance.chain_id}:${balance.address}`
      )
    }
    return undefined
  }, [filteredDuneTokenBalances])

  // Get user's tokens from currencies api
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

  // Get external token list for search
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

  // Auto-select token with highest balance when wallet connects or changes
  useEffect(() => {
    if (!autoSelectToken) {
      return
    }

    if (
      address &&
      isValidAddress &&
      !token &&
      sortedUserTokens &&
      sortedUserTokens.length > 0
    ) {
      // Select the first token (highest balance)
      const topToken = sortedUserTokens[0]
      setToken(topToken)
    }
  }, [
    address,
    isValidAddress,
    token,
    sortedUserTokens,
    setToken,
    autoSelectToken
  ])

  // Update starred chains when the modal opens to sync with other instances
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

  const triggerWithBalances = useMemo(() => {
    const injectBalances = (node: ReactNode): ReactNode => {
      if (!isValidElement(node)) {
        return node
      }

      const element = node as ReactElement<any>

      if (element.type === PaymentMethodTrigger) {
        return cloneElement(element, {
          balanceMap: tokenBalances ?? undefined
        })
      }

      const childElements = element.props?.children
      if (!childElements) {
        return element
      }

      const children = Children.map(childElements, injectBalances)
      return cloneElement(element, undefined, children)
    }

    return trigger ? injectBalances(trigger) : trigger
  }, [trigger, tokenBalances])

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
        // Set the initial chain filter before opening the modal
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
      token
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

  return (
    <>
      <div style={{ position: 'relative' }}>
        <Modal
          open={open}
          onOpenChange={onOpenChange}
          showCloseButton={false}
          trigger={triggerWithBalances}
          css={{
            p: '4',
            display: 'flex',
            flexDirection: 'column',
            height: 'min(85vh, 540px)',
            width: 'min(400px, 100vw)',
            maxWidth: 'min(400px, 100vw)',
            minWidth: 0,
            boxSizing: 'border-box'
          }}
        >
          <Flex
            direction="column"
            css={{
              width: '100%',
              height: '100%',
              gap: '3',
              overflowY: 'hidden',
              minWidth: 0,
              maxWidth: '100%'
            }}
          >
            {/* Header with back button */}
            <Flex align="center" css={{ gap: '1' }}>
              <Button
                color="ghost"
                size="none"
                onClick={() => onOpenChange(false)}
                css={{
                  p: '0',
                  minWidth: 'auto',
                  color: 'gray9',
                  cursor: 'pointer'
                }}
              >
                <FontAwesomeIcon icon={faChevronLeft} width={20} height={20} />
              </Button>
              <Text style="subtitle2">Pay with</Text>
            </Flex>

            <Flex
              css={{
                flex: 1,
                gap: '3',
                overflow: 'hidden',
                minWidth: 0,
                maxWidth: '100%'
              }}
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
                css={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  minWidth: 0,
                  maxWidth: '100%',
                  height: '100%'
                }}
              >
                {/* Search Input Section - Fixed */}
                <Flex
                  direction="column"
                  align="start"
                  css={{
                    width: '100%',
                    gap: '2',
                    background: 'modal-background',
                    minWidth: 0,
                    maxWidth: '100%'
                  }}
                >
                  {/* Search input and Chain Filter Button Row */}
                  <Flex
                    align="center"
                    css={{
                      width: '100%',
                      gap: '2',
                      minWidth: 0
                    }}
                  >
                    <AccessibleListItem
                      value="input"
                      asChild
                      css={{ flex: 1, minWidth: 0 }}
                    >
                      <Input
                        ref={setTokenSearchInputElement}
                        placeholder="Search for a token"
                        icon={
                          <Box css={{ color: 'gray9' }}>
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              width={16}
                              height={16}
                            />
                          </Box>
                        }
                        containerCss={{
                          width: '100%',
                          height: 40,
                          mb: isDesktop ? '1' : '0'
                        }}
                        css={{
                          width: '100%',
                          _placeholder_parent: {
                            textOverflow: 'ellipsis'
                          }
                        }}
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
                  css={{
                    flex: 1,
                    overflowY: 'auto',
                    gap: '3',
                    pt: '2',
                    scrollbarColor: 'var(--relay-colors-gray5) transparent',
                    minWidth: 0,
                    maxWidth: '100%'
                  }}
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
                    // When a specific chain is filtered, show TokenList format
                    <TokenList
                      title="Tokens"
                      tokens={sortedCombinedTokens}
                      isLoading={isLoadingTokenList}
                      isLoadingBalances={isLoadingBalances}
                      chainFilterId={chainFilter.id}
                    />
                  ) : (
                    // When "All Chains" is selected, show Recommended/Other Tokens
                    <Flex direction="column" css={{ gap: '3' }}>
                      {/* Recommended Section - First 5 user tokens */}
                      {sortedUserTokens.length > 0 && (
                        <PaymentTokenList
                          title="Recommended"
                          tokens={sortedUserTokens.slice(0, 5)}
                          isLoading={isLoadingUserTokens}
                          isLoadingBalances={isLoadingBalances}
                          chainFilterId={chainFilter.id}
                          limit={5}
                        />
                      )}

                      {/* Other Tokens Section - Next 5 user tokens (6-10) */}
                      {sortedUserTokens.length > 5 && (
                        <PaymentTokenList
                          title="Other Tokens"
                          tokens={sortedUserTokens.slice(5)}
                          isLoading={isLoadingUserTokens}
                          isLoadingBalances={isLoadingBalances}
                          chainFilterId={chainFilter.id}
                          limit={5}
                          opacity={0.5}
                        />
                      )}
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
                      css={{ py: '5', maxWidth: 312, alignSelf: 'center' }}
                    >
                      {!chainFilter?.id && isSearchTermValidAddress && (
                        <Box css={{ color: 'gray8', mb: '2' }}>
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
                        css={{ textAlign: 'center' }}
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
        </Modal>
      </div>

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

// Compact Chain Filter Component
type CompactChainFilterProps = {
  options: ChainFilterValue[]
  value: ChainFilterValue
  onSelect: (value: ChainFilterValue) => void
  popularChainIds?: number[]
  onChainStarToggle?: () => void
  starredChainIds?: number[]
  onAnalyticEvent?: (eventName: string, data?: any) => void
}

const CompactChainFilter: FC<CompactChainFilterProps> = ({
  options,
  value,
  onSelect,
  popularChainIds,
  onChainStarToggle,
  starredChainIds,
  onAnalyticEvent
}) => {
  const [open, setOpen] = useState(false)
  const [chainSearchInput, setChainSearchInput] = useState('')
  const chainFuse = new Fuse(options, {
    includeScore: true,
    includeMatches: true,
    threshold: 0.2,
    keys: ['id', 'name', 'displayName']
  })

  const { allChainsOption, starredChains, alphabeticalChains } = useMemo(
    () => groupChains(options, popularChainIds, starredChainIds),
    [options, popularChainIds, starredChainIds, open]
  )

  const filteredChains = useMemo(() => {
    if (chainSearchInput.trim() === '') {
      return null
    }
    const results = chainFuse.search(chainSearchInput)
    const uniqueChains = new Map()
    results.forEach((result) => {
      if (!uniqueChains.has(result.item.id)) {
        uniqueChains.set(result.item.id, result.item)
      }
    })
    return Array.from(uniqueChains.values())
  }, [chainSearchInput, chainFuse])

  return (
    <Dropdown
      open={open}
      onOpenChange={(open) => setOpen(open)}
      trigger={
        <Button
          aria-label="Chain filter"
          color="ghost"
          size="none"
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: 40,
            px: '12px',
            cursor: 'pointer',
            backgroundColor: 'dropdown-background',
            borderRadius: 'dropdown-border-radius',
            flexShrink: 0
          }}
        >
          {value.id ? (
            <ChainIcon
              chainId={value.id}
              width={20}
              height={20}
              css={{ borderRadius: 4, overflow: 'hidden' }}
            />
          ) : (
            <AllChainsLogo style={{ width: 20, height: 20 }} />
          )}
          <Box css={{ color: 'gray9' }}>
            <FontAwesomeIcon
              icon={faChevronDown}
              width={12}
              height={12}
              style={{
                transform: open ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s'
              }}
            />
          </Box>
        </Button>
      }
      contentProps={{
        align: 'end',
        avoidCollisions: false,
        css: {
          p: 0,
          minWidth: '100%',
          maxWidth: '100%',
          mx: '0'
        }
      }}
    >
      <Flex direction="column" css={{ p: '2' }}>
        <Input
          placeholder="Search for a chain"
          icon={
            <Box css={{ color: 'gray9' }}>
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                width={16}
                height={16}
              />
            </Box>
          }
          containerCss={{
            width: '100%',
            height: 40,
            mb: '2'
          }}
          css={{
            width: '100%',
            _placeholder_parent: {
              textOverflow: 'ellipsis'
            },
            '--borderColor': 'colors.subtle-border-color',
            border: '1px solid var(--borderColor)',
            backgroundColor: 'modal-background'
          }}
          value={chainSearchInput}
          onChange={(e) =>
            setChainSearchInput((e.target as HTMLInputElement).value)
          }
          onKeyDown={(e) => e.stopPropagation()}
        />
        <Flex
          direction="column"
          css={{
            overflowY: 'auto',
            borderRadius: 8,
            maxHeight: 290,
            scrollbarColor: 'var(--relay-colors-gray5) transparent'
          }}
        >
          {filteredChains ? (
            filteredChains.length > 0 ? (
              filteredChains.map((chain) => {
                const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                return (
                  <Flex
                    key={chain.id?.toString() ?? 'all-chains'}
                    onClick={() => {
                      setOpen(false)
                      onSelect(chain)
                      setChainSearchInput('')
                    }}
                    css={{
                      padding: '8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      backgroundColor: 'modal-background',
                      _hover: {
                        backgroundColor: 'gray3'
                      }
                    }}
                  >
                    <ChainFilterRow
                      chain={chain}
                      tag={tag}
                      onToggleStar={onChainStarToggle}
                      onAnalyticEvent={onAnalyticEvent}
                    />
                  </Flex>
                )
              })
            ) : (
              <Text style="body1" css={{ p: '2', textAlign: 'center' }}>
                No results.
              </Text>
            )
          ) : (
            <>
              {allChainsOption && (
                <DropdownMenuItem
                  onClick={() => {
                    setOpen(false)
                    onSelect(allChainsOption)
                    setChainSearchInput('')
                  }}
                  css={{ p: '2' }}
                >
                  <ChainFilterRow
                    chain={allChainsOption}
                    onAnalyticEvent={onAnalyticEvent}
                  />
                </DropdownMenuItem>
              )}

              {starredChains.length > 0 && (
                <>
                  <Flex align="center" css={{ px: '2', py: '1', gap: '1' }}>
                    <Box css={{ color: 'primary9' }}>
                      <FontAwesomeIcon icon={faStar} width={12} height={12} />
                    </Box>
                    <Text style="subtitle2" color="subtle">
                      Starred Chains
                    </Text>
                  </Flex>
                  {starredChains.map((chain: ChainFilterValue) => {
                    const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                    return (
                      <Flex
                        key={chain.id?.toString() ?? 'all-chains'}
                        onClick={() => {
                          setOpen(false)
                          onSelect(chain)
                          setChainSearchInput('')
                        }}
                        css={{
                          padding: '8px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          backgroundColor: 'modal-background',
                          _hover: {
                            backgroundColor: 'gray3'
                          }
                        }}
                      >
                        <ChainFilterRow
                          chain={chain}
                          tag={tag}
                          onToggleStar={onChainStarToggle}
                          showStar={false}
                          onAnalyticEvent={onAnalyticEvent}
                        />
                      </Flex>
                    )
                  })}
                </>
              )}

              <Text style="subtitle2" color="subtle" css={{ px: '2', py: '1' }}>
                Chains A-Z
              </Text>
              {alphabeticalChains.map((chain: ChainFilterValue) => {
                const tag = 'tags' in chain ? chain.tags?.[0] : undefined
                return (
                  <Flex
                    key={chain.id?.toString() ?? 'all-chains'}
                    onClick={() => {
                      setOpen(false)
                      onSelect(chain)
                      setChainSearchInput('')
                    }}
                    css={{
                      padding: '8px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      backgroundColor: 'modal-background',
                      _hover: {
                        backgroundColor: 'gray3'
                      }
                    }}
                  >
                    <ChainFilterRow
                      chain={chain}
                      tag={tag}
                      onToggleStar={onChainStarToggle}
                      onAnalyticEvent={onAnalyticEvent}
                    />
                  </Flex>
                )
              })}
            </>
          )}
        </Flex>
      </Flex>
    </Dropdown>
  )
}

// Chain Filter Row Component (for the dropdown items)
type ChainFilterRowProps = {
  chain: ChainFilterValue
  tag?: string
  onToggleStar?: () => void
  showStar?: boolean
  onAnalyticEvent?: (eventName: string, data?: any) => void
}

const ChainFilterRow: FC<ChainFilterRowProps> = ({
  chain,
  tag,
  onToggleStar,
  showStar = true,
  onAnalyticEvent
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isStarred = chain.id ? isChainStarred(chain.id) : false

  // Click outside handler
  const handleClickOutside = useCallback((event: MouseEvent | TouchEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setDropdownOpen(false)
    }
  }, [])

  // Escape key handler
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setDropdownOpen(false)
    }
  }, [])

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [dropdownOpen, handleClickOutside, handleEscapeKey])

  const handleToggleStar = () => {
    if (chain.id) {
      const previouslyStarred = isStarred
      toggleStarredChain(chain.id)
      const eventName = previouslyStarred
        ? EventNames.CHAIN_UNSTARRED
        : EventNames.CHAIN_STARRED
      onAnalyticEvent?.(eventName, {
        chain: chain.name,
        chain_id: chain.id
      })
      onToggleStar?.()
      setDropdownOpen(false)
    }
  }

  // Don't show context menu for "All Chains" option
  if (!chain.id) {
    return (
      <Flex
        align="center"
        css={{
          gap: '2',
          cursor: 'pointer',
          flexShrink: 0,
          alignContent: 'center',
          width: '100%'
        }}
      >
        <AllChainsLogo style={{ width: 24, height: 24 }} />
        <Text style="subtitle2">{chain.name}</Text>
      </Flex>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Flex
        align="center"
        onContextMenu={(e) => {
          e.preventDefault()
          setDropdownOpen(true)
        }}
        css={{
          gap: '2',
          cursor: 'pointer',
          flexShrink: 0,
          alignContent: 'center',
          width: '100%',
          position: 'relative',
          userSelect: 'none'
        }}
        style={{
          WebkitUserSelect: 'none'
        }}
      >
        <ChainIcon chainId={chain.id} square width={24} height={24} />
        <Text style="subtitle2">
          {('displayName' in chain && chain.displayName) || chain.name}
        </Text>
        {showStar && isStarred && (
          <Box css={{ color: 'primary9' }}>
            <FontAwesomeIcon icon={faStar} width={12} height={12} />
          </Box>
        )}
        {tag && <TagPill tag={tag} />}
      </Flex>

      {dropdownOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            minWidth: 140,
            zIndex: 9999
          }}
          onClick={(e) => {
            e.stopPropagation()
            handleToggleStar()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <Flex
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3',
              borderRadius: 12,
              cursor: 'pointer',
              backgroundColor: 'modal-background',
              _hover: {
                backgroundColor: 'gray2'
              }
            }}
          >
            <Box
              css={{
                color: isStarred ? 'gray8' : 'primary9'
              }}
            >
              <FontAwesomeIcon icon={faStar} width={16} height={16} />
            </Box>
            <Text style="subtitle1" css={{ lineHeight: '20px' }}>
              {isStarred ? 'Unstar chain' : 'Star chain'}
            </Text>
          </Flex>
        </div>
      )}
    </div>
  )
}

export default PaymentMethod
