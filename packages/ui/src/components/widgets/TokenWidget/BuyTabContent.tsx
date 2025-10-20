import { TabsContent } from '../../primitives/Tabs.js'
import { Flex, Text, Button, Box } from '../../primitives/index.js'
import AmountInput from '../../common/AmountInput.js'
import {
  formatFixedLength,
  formatNumber,
  formatDollar
} from '../../../utils/numbers.js'
import { PriceImpact } from '../SwapWidget/PriceImpact.js'
import { BalanceDisplay } from '../../common/BalanceDisplay.js'
import { Divider } from '@relayprotocol/relay-design-system/jsx'
import { MultiWalletDropdown } from '../../common/MultiWalletDropdown.js'
import TokenSelector from '../../common/TokenSelector/TokenSelector.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboard, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { EventNames } from '../../../constants/events.js'
import { isChainLocked } from '../../../utils/tokenSelector.js'
import type { Dispatch, FC, SetStateAction } from 'react'
import type { TradeType, ChildrenProps } from './TokenWidgetRenderer.js'
import type { Token, LinkedWallet } from '../../../types/index.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import { isDeadAddress, tronDeadAddress } from '@relayprotocol/relay-sdk'
import TokenActionButton from './TokenActionButton.js'
import { TokenWidgetTrigger } from './TokenWidgetTrigger.js'
import AmountSectionHeader from './AmountSectionHeader.js'
import AmountModeToggle from './AmountModeToggle.js'
import TransactionDetailsFooter from './TransactionDetailsFooter.js'
import SectionContainer from './SectionContainer.js'

type LinkNewWalletHandler = (params: {
  chain?: RelayChain
  direction: 'to' | 'from'
}) => Promise<LinkedWallet> | void

type BuyTabContentProps = {
  slippageTolerance?: string
  onOpenSlippageConfig?: () => void
  isUsdInputMode: boolean
  usdOutputValue: string
  tradeType: TradeType
  amountOutputValue: string
  amountInputValue: string
  toToken?: Token
  fromToken?: Token
  quote: ChildrenProps['quote']
  isFetchingQuote: ChildrenProps['isFetchingQuote']
  isLoadingToTokenPrice: ChildrenProps['isLoadingToTokenPrice']
  outputAmountUsd: number | null
  toTokenPriceData: ChildrenProps['toTokenPriceData']
  setUsdOutputValue: (value: string) => void
  setTradeType: ChildrenProps['setTradeType']
  setAmountOutputValue: ChildrenProps['setAmountOutputValue']
  setAmountInputValue: ChildrenProps['setAmountInputValue']
  setUsdInputValue: (value: string) => void
  debouncedAmountOutputControls: ChildrenProps['debouncedAmountOutputControls']
  onAnalyticEvent?: (eventName: string, data?: any) => void
  feeBreakdown: ChildrenProps['feeBreakdown']
  isLoadingToBalance: ChildrenProps['isLoadingToBalance']
  toBalance: ChildrenProps['toBalance']
  toBalancePending: ChildrenProps['toBalancePending']
  address: ChildrenProps['address']
  multiWalletSupportEnabled: boolean
  toChainWalletVMSupported: ChildrenProps['toChainWalletVMSupported']
  disablePasteWalletAddressOption?: boolean
  recipient: ChildrenProps['recipient']
  setCustomToAddress: ChildrenProps['setCustomToAddress']
  onConnectWallet?: () => void
  onLinkNewWallet?: LinkNewWalletHandler
  linkedWallets?: LinkedWallet[]
  toChain?: RelayChain
  isValidToAddress: ChildrenProps['isValidToAddress']
  isRecipientLinked?: ChildrenProps['isRecipientLinked']
  setAddressModalOpen: Dispatch<SetStateAction<boolean>>
  toDisplayName?: ChildrenProps['toDisplayName']
  isValidFromAddress: ChildrenProps['isValidFromAddress']
  fromChainWalletVMSupported: ChildrenProps['fromChainWalletVMSupported']
  supportedWalletVMs: ChildrenProps['supportedWalletVMs']
  handleSetFromToken: (token?: Token) => void
  handleSetToToken: (token?: Token) => void
  lockToToken: boolean
  lockFromToken: boolean
  isSingleChainLocked: boolean
  lockChainId?: number
  popularChainIds?: number[]
  transactionModalOpen: ChildrenProps['transactionModalOpen']
  depositAddressModalOpen: boolean
  hasInsufficientBalance: ChildrenProps['hasInsufficientBalance']
  isInsufficientLiquidityError?: ChildrenProps['isInsufficientLiquidityError']
  recipientWalletSupportsChain: ChildrenProps['recipientWalletSupportsChain']
  isSameCurrencySameRecipientSwap: ChildrenProps['isSameCurrencySameRecipientSwap']
  debouncedInputAmountValue: ChildrenProps['debouncedInputAmountValue']
  debouncedOutputAmountValue: ChildrenProps['debouncedOutputAmountValue']
  showHighPriceImpactWarning: boolean
  disableSwapButton?: boolean
  toggleInputMode: () => void
}

const BuyTabContent: FC<BuyTabContentProps> = ({
  slippageTolerance,
  onOpenSlippageConfig,
  isUsdInputMode,
  usdOutputValue,
  tradeType,
  amountOutputValue,
  amountInputValue,
  toToken,
  fromToken,
  quote,
  isFetchingQuote,
  isLoadingToTokenPrice,
  outputAmountUsd,
  toTokenPriceData,
  setUsdOutputValue,
  setTradeType,
  setAmountOutputValue,
  setAmountInputValue,
  setUsdInputValue,
  debouncedAmountOutputControls,
  onAnalyticEvent,
  feeBreakdown,
  isLoadingToBalance,
  toBalance,
  toBalancePending,
  address,
  multiWalletSupportEnabled,
  toChainWalletVMSupported,
  disablePasteWalletAddressOption,
  recipient,
  setCustomToAddress,
  onConnectWallet,
  onLinkNewWallet,
  linkedWallets,
  toChain,
  isValidToAddress,
  isRecipientLinked,
  setAddressModalOpen,
  toDisplayName,
  isValidFromAddress,
  fromChainWalletVMSupported,
  supportedWalletVMs,
  handleSetFromToken,
  handleSetToToken,
  lockToToken,
  lockFromToken,
  isSingleChainLocked,
  lockChainId,
  popularChainIds,
  transactionModalOpen,
  depositAddressModalOpen,
  hasInsufficientBalance,
  isInsufficientLiquidityError,
  recipientWalletSupportsChain,
  isSameCurrencySameRecipientSwap,
  debouncedInputAmountValue,
  debouncedOutputAmountValue,
  showHighPriceImpactWarning,
  disableSwapButton,
  toggleInputMode
}) => {
  const fromChainId = fromToken?.chainId
  const lockedChainIds = isSingleChainLocked
    ? lockChainId !== undefined
      ? [lockChainId]
      : undefined
    : isChainLocked(
          fromChainId,
          lockChainId,
          toToken?.chainId,
          lockFromToken
        ) && fromChainId !== undefined
      ? [fromChainId]
      : undefined

  return (
    <TabsContent value="buy">
      <SectionContainer
        css={{
          backgroundColor: 'widget-background',
          mb: 'widget-card-section-gutter'
        }}
        id={'buy-token-section'}
      >
        <AmountSectionHeader
          label="Amount"
          slippageTolerance={slippageTolerance}
          onOpenSlippageConfig={onOpenSlippageConfig}
        />
        <Flex
          align="center"
          justify="between"
          css={{ gap: '4', width: '100%' }}
        >
          <AmountInput
            prefixSymbol={isUsdInputMode ? '$' : undefined}
            value={
              isUsdInputMode
                ? usdOutputValue
                : tradeType === 'EXPECTED_OUTPUT'
                  ? amountOutputValue
                  : amountOutputValue
                    ? formatFixedLength(amountOutputValue, 8)
                    : amountOutputValue
            }
            setValue={(value) => {
              if (isUsdInputMode) {
                setUsdOutputValue(value)
                setTradeType('EXPECTED_OUTPUT')
                if (Number(value) === 0) {
                  setAmountInputValue('')
                  setUsdInputValue('')
                  debouncedAmountOutputControls.flush()
                }
              } else {
                setAmountOutputValue(value)
                setTradeType('EXPECTED_OUTPUT')
                if (Number(value) === 0) {
                  setAmountInputValue('')
                  debouncedAmountOutputControls.flush()
                }
              }
            }}
            disabled={!toToken || !fromChainWalletVMSupported}
            onFocus={() => {
              onAnalyticEvent?.(EventNames.SWAP_OUTPUT_FOCUSED)
            }}
            css={{
              fontWeight: '700',
              fontSize: 32,
              color:
                isFetchingQuote && tradeType === 'EXACT_INPUT'
                  ? 'text-subtle'
                  : 'input-color',
              _placeholder: {
                color:
                  isFetchingQuote && tradeType === 'EXACT_INPUT'
                    ? 'text-subtle'
                    : 'input-color'
              },
              _disabled: {
                cursor: 'not-allowed',
                _placeholder: {
                  color: 'gray10'
                },
                color: 'gray10'
              }
            }}
          />
        </Flex>
        <Flex
          align="center"
          justify="between"
          css={{ gap: '3', width: '100%' }}
        >
          <Flex
            align="center"
            css={{
              gap: '3',
              minHeight: 18
            }}
          >
            <AmountModeToggle onToggle={toggleInputMode}>
              {isUsdInputMode ? (
                toToken ? (
                  usdOutputValue && Number(usdOutputValue) > 0 ? (
                    amountOutputValue && !isLoadingToTokenPrice ? (
                      `${formatNumber(amountOutputValue, 4, false)} ${toToken.symbol}`
                    ) : (
                      <Box
                        css={{
                          width: 45,
                          height: 12,
                          backgroundColor: 'gray7',
                          borderRadius: 'widget-border-radius'
                        }}
                      />
                    )
                  ) : (
                    `0 ${toToken.symbol}`
                  )
                ) : null
              ) : toToken &&
                quote?.details?.currencyOut?.amountUsd &&
                !isFetchingQuote ? (
                formatDollar(Number(quote.details.currencyOut.amountUsd))
              ) : toToken &&
                isLoadingToTokenPrice &&
                amountOutputValue &&
                Number(amountOutputValue) > 0 ? (
                <Box
                  css={{
                    width: 45,
                    height: 12,
                    backgroundColor: 'gray7',
                    borderRadius: 'widget-border-radius'
                  }}
                />
              ) : toToken &&
                outputAmountUsd &&
                outputAmountUsd > 0 &&
                toTokenPriceData?.price &&
                toTokenPriceData.price > 0 ? (
                formatDollar(outputAmountUsd)
              ) : (
                '$0.00'
              )}
            </AmountModeToggle>
            <PriceImpact
              toToken={toToken}
              isFetchingQuote={isFetchingQuote}
              feeBreakdown={feeBreakdown}
              quote={quote}
            />
          </Flex>
          <Flex css={{ marginLeft: 'auto' }}>
            {toToken ? (
              <BalanceDisplay
                hideBalanceLabel={true}
                displaySymbol={true}
                isLoading={isLoadingToBalance}
                balance={toBalance}
                decimals={toToken?.decimals}
                symbol={toToken?.symbol}
                isConnected={
                  !isDeadAddress(address) &&
                  address !== tronDeadAddress &&
                  address !== undefined
                }
                pending={toBalancePending}
                size="md"
              />
            ) : (
              <Flex css={{ height: 18 }} />
            )}
          </Flex>
        </Flex>

        <Divider color="gray4" />

        <Flex align="center" css={{ width: '100%', gap: '2' }}>
          <Text style="subtitle2" color="subtle">
            Pay with
          </Text>
          {multiWalletSupportEnabled && toChainWalletVMSupported ? (
            <MultiWalletDropdown
              context="destination"
              disablePasteWalletAddressOption={disablePasteWalletAddressOption}
              selectedWalletAddress={recipient}
              onSelect={(wallet) => {
                setCustomToAddress(wallet.address)
              }}
              chain={toChain}
              onLinkNewWallet={() => {
                if (!address && toChainWalletVMSupported) {
                  onConnectWallet?.()
                } else {
                  onLinkNewWallet?.({
                    chain: toChain,
                    direction: 'to'
                  })?.then((wallet) => {
                    setCustomToAddress(wallet.address)
                  })
                }
              }}
              setAddressModalOpen={setAddressModalOpen}
              wallets={linkedWallets ?? []}
              onAnalyticEvent={onAnalyticEvent}
              testId="destination-wallet-select-button"
            />
          ) : (
            <Button
              color={
                isValidToAddress &&
                multiWalletSupportEnabled &&
                !isRecipientLinked
                  ? 'warning'
                  : 'secondary'
              }
              corners="pill"
              size="none"
              css={{
                display: 'flex',
                alignItems: 'center',
                px: '2',
                py: '1'
              }}
              onClick={() => {
                setAddressModalOpen(true)
                onAnalyticEvent?.(EventNames.SWAP_ADDRESS_MODAL_CLICKED)
              }}
            >
              {isValidToAddress &&
              multiWalletSupportEnabled &&
              !isRecipientLinked ? (
                <Box css={{ color: 'amber11' }}>
                  <FontAwesomeIcon icon={faClipboard} width={16} height={16} />
                </Box>
              ) : null}
              <Text
                style="subtitle2"
                css={{
                  color:
                    isValidToAddress &&
                    multiWalletSupportEnabled &&
                    !isRecipientLinked
                      ? 'amber11'
                      : 'anchor-color'
                }}
              >
                {!isValidToAddress ? `Enter Address` : toDisplayName}
              </Text>
            </Button>
          )}
        </Flex>

        <Flex justify="between" css={{ width: '100%' }}>
          <TokenSelector
            address={address}
            isValidAddress={isValidFromAddress}
            token={fromToken}
            onAnalyticEvent={onAnalyticEvent}
            fromChainWalletVMSupported={fromChainWalletVMSupported}
            supportedWalletVMs={supportedWalletVMs}
            setToken={(token) => {
              if (
                token?.address === toToken?.address &&
                token?.chainId === toToken?.chainId &&
                address === recipient &&
                (!lockToToken || !fromToken)
              ) {
                handleSetFromToken(toToken)
                handleSetToToken(fromToken)
              } else {
                handleSetFromToken(token)
              }
            }}
            context="from"
            multiWalletSupportEnabled={multiWalletSupportEnabled}
            lockedChainIds={lockedChainIds}
            chainIdsFilter={
              !fromChainWalletVMSupported && toToken
                ? [toToken.chainId]
                : undefined
            }
            popularChainIds={popularChainIds}
            trigger={
              <div style={{ width: 'max-content' }}>
                <TokenWidgetTrigger
                  token={fromToken}
                  locked={lockFromToken}
                  address={address}
                  testId="origin-token-select-button"
                />
              </div>
            }
          />
          <Flex direction="column" align="end">
            <Flex align="center" css={{ gap: '1' }}>
              <Text style="h6">$21 total</Text>
              <Box
                css={{
                  color: 'gray8',
                  width: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FontAwesomeIcon icon={faInfoCircle} />
              </Box>
            </Flex>
            <Text style="subtitle3" color="subtleSecondary">
              0.0004 ETH
            </Text>
          </Flex>
        </Flex>

        <Divider color="gray4" />

        <Flex align="center" css={{ width: '100%', gap: '2' }}>
          <Text style="subtitle2" color="subtle">
            Send to
          </Text>
          {multiWalletSupportEnabled && toChainWalletVMSupported ? (
            <MultiWalletDropdown
              context="destination"
              disablePasteWalletAddressOption={disablePasteWalletAddressOption}
              selectedWalletAddress={recipient}
              onSelect={(wallet) => {
                setCustomToAddress(wallet.address)
              }}
              chain={toChain}
              onLinkNewWallet={() => {
                if (!address && toChainWalletVMSupported) {
                  onConnectWallet?.()
                } else {
                  onLinkNewWallet?.({
                    chain: toChain,
                    direction: 'to'
                  })?.then((wallet) => {
                    setCustomToAddress(wallet.address)
                  })
                }
              }}
              setAddressModalOpen={setAddressModalOpen}
              wallets={linkedWallets ?? []}
              onAnalyticEvent={onAnalyticEvent}
              testId="destination-wallet-select-button"
            />
          ) : (
            <Button
              color={
                isValidToAddress &&
                multiWalletSupportEnabled &&
                !isRecipientLinked
                  ? 'warning'
                  : 'secondary'
              }
              corners="pill"
              size="none"
              css={{
                display: 'flex',
                alignItems: 'center',
                px: '2',
                py: '1'
              }}
              onClick={() => {
                setAddressModalOpen(true)
                onAnalyticEvent?.(EventNames.SWAP_ADDRESS_MODAL_CLICKED)
              }}
            >
              {isValidToAddress &&
              multiWalletSupportEnabled &&
              !isRecipientLinked ? (
                <Box css={{ color: 'amber11' }}>
                  <FontAwesomeIcon icon={faClipboard} width={16} height={16} />
                </Box>
              ) : null}
              <Text
                style="subtitle2"
                css={{
                  color:
                    isValidToAddress &&
                    multiWalletSupportEnabled &&
                    !isRecipientLinked
                      ? 'amber11'
                      : 'anchor-color'
                }}
              >
                {!isValidToAddress ? `Enter Address` : toDisplayName}
              </Text>
            </Button>
          )}
        </Flex>

        <Flex css={{ width: '100%' }}>
          <TokenActionButton
            onClick={() => {
              const token = fromToken
              const amount = amountInputValue
              console.log(`Buying ${token?.symbol}`, {
                token,
                amount
              })
              onAnalyticEvent?.('TOKEN_BUY_CLICKED', {
                token,
                amount
              })
            }}
            ctaCopy="Buy"
            disabled={
              !toToken ||
              hasInsufficientBalance ||
              transactionModalOpen ||
              depositAddressModalOpen ||
              !isValidToAddress
            }
            isFetchingQuote={isFetchingQuote}
            hasValidAmount={
              !!quote &&
              Number(debouncedOutputAmountValue) > 0 &&
              Number(debouncedOutputAmountValue) > 0
            }
            onConnectWallet={onConnectWallet}
            address={address}
          />
        </Flex>

        <TransactionDetailsFooter />
      </SectionContainer>
    </TabsContent>
  )
}

export default BuyTabContent
