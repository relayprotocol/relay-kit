import { TabsContent } from '../../primitives/Tabs.js'
import { Flex, Text, Button, Box } from '../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboard } from '@fortawesome/free-solid-svg-icons'
import AmountInput from '../../common/AmountInput.js'
import {
  formatFixedLength,
  formatNumber,
  formatDollar
} from '../../../utils/numbers.js'
import { EventNames } from '../../../constants/events.js'
import { Divider } from '@relayprotocol/relay-design-system/jsx'
import { MultiWalletDropdown } from '../../common/MultiWalletDropdown.js'
import PaymentMethod from '../../common/TokenSelector/PaymentMethod.js'
import { PaymentMethodTrigger } from '../../common/TokenSelector/triggers/PaymentMethodTrigger.js'
import type { Dispatch, FC, SetStateAction } from 'react'
import type { TradeType, ChildrenProps } from './TokenWidgetRenderer.js'
import type { Token, LinkedWallet } from '../../../types/index.js'
import {
  isDeadAddress,
  tronDeadAddress,
  type RelayChain
} from '@relayprotocol/relay-sdk'
import TokenActionButton from './TokenActionButton.js'
import { BalanceDisplay } from '../../common/BalanceDisplay.js'
import AmountSectionHeader from './AmountSectionHeader.js'
import AmountModeToggle from './AmountModeToggle.js'
import TransactionDetailsFooter from './TransactionDetailsFooter.js'
import SectionContainer from './SectionContainer.js'
import { isChainLocked } from '../../../utils/tokenSelector.js'
import { WidgetErrorWell } from '../WidgetErrorWell.js'
import { FeeBreakdownInfo } from './FeeBreakdownInfo.js'

type LinkNewWalletHandler = (params: {
  chain?: RelayChain
  direction: 'to' | 'from'
}) => Promise<LinkedWallet> | void

type SellTabContentProps = {
  slippageTolerance?: string
  onOpenSlippageConfig?: () => void
  onSlippageToleranceChange?: (value: string | undefined) => void
  disableInputAutoFocus: boolean
  isUsdInputMode: boolean
  usdInputValue: string
  tradeType: TradeType
  amountInputValue: string
  amountOutputValue: string
  conversionRate: number | null
  fromToken?: Token
  toToken?: Token
  quote: ChildrenProps['quote']
  isFetchingQuote: ChildrenProps['isFetchingQuote']
  inputAmountUsd: number | null
  fromTokenPriceData: ChildrenProps['fromTokenPriceData']
  isLoadingFromTokenPrice: ChildrenProps['isLoadingFromTokenPrice']
  toggleInputMode: () => void
  setUsdInputValue: (value: string) => void
  setTradeType: ChildrenProps['setTradeType']
  setTokenInputCache: (value: string) => void
  setAmountInputValue: ChildrenProps['setAmountInputValue']
  setAmountOutputValue: ChildrenProps['setAmountOutputValue']
  setUsdOutputValue: (value: string) => void
  debouncedAmountInputControls: ChildrenProps['debouncedAmountInputControls']
  onAnalyticEvent?: (eventName: string, data?: any) => void
  feeBreakdown: ChildrenProps['feeBreakdown']
  fromBalance: ChildrenProps['fromBalance']
  isLoadingFromBalance: ChildrenProps['isLoadingFromBalance']
  toBalance: ChildrenProps['toBalance']
  isLoadingToBalance: ChildrenProps['isLoadingToBalance']
  toBalancePending: ChildrenProps['toBalancePending']
  hasInsufficientBalance: ChildrenProps['hasInsufficientBalance']
  address: ChildrenProps['address']
  timeEstimate?: ChildrenProps['timeEstimate']
  fromBalancePending: ChildrenProps['fromBalancePending']
  multiWalletSupportEnabled: boolean
  fromChainWalletVMSupported: ChildrenProps['fromChainWalletVMSupported']
  disablePasteWalletAddressOption?: boolean
  onSetPrimaryWallet?: (address: string) => void
  fromChain?: RelayChain
  toChain?: RelayChain
  onConnectWallet?: () => void
  onLinkNewWallet?: LinkNewWalletHandler
  linkedWallets?: LinkedWallet[]
  setAddressModalOpen: Dispatch<SetStateAction<boolean>>
  transactionModalOpen: ChildrenProps['transactionModalOpen']
  depositAddressModalOpen: boolean
  isValidFromAddress: ChildrenProps['isValidFromAddress']
  isValidToAddress: ChildrenProps['isValidToAddress']
  toChainWalletVMSupported: ChildrenProps['toChainWalletVMSupported']
  isInsufficientLiquidityError?: ChildrenProps['isInsufficientLiquidityError']
  recipientWalletSupportsChain: ChildrenProps['recipientWalletSupportsChain']
  recipient?: ChildrenProps['recipient']
  setCustomToAddress: ChildrenProps['setCustomToAddress']
  isRecipientLinked?: ChildrenProps['isRecipientLinked']
  isSameCurrencySameRecipientSwap: ChildrenProps['isSameCurrencySameRecipientSwap']
  debouncedInputAmountValue: ChildrenProps['debouncedInputAmountValue']
  debouncedOutputAmountValue: ChildrenProps['debouncedOutputAmountValue']
  showHighPriceImpactWarning: boolean
  disableSwapButton?: boolean
  percentOptions?: number[]
  onSelectPercentage?: (percent: number) => void
  onSelectMax?: () => void | Promise<void>
  onPrimaryAction: () => void
  toDisplayName?: ChildrenProps['toDisplayName']
  error: ChildrenProps['error']
  relayerFeeProportion: ChildrenProps['relayerFeeProportion']
  highRelayerServiceFee: ChildrenProps['highRelayerServiceFee']
  isCapacityExceededError?: ChildrenProps['isCapacityExceededError']
  isCouldNotExecuteError?: ChildrenProps['isCouldNotExecuteError']
  supportsExternalLiquidity: ChildrenProps['supportsExternalLiquidity']
  recipientLinkedWallet?: ChildrenProps['linkedWallet']
  toChainVmType?: string
  supportedWalletVMs: ChildrenProps['supportedWalletVMs']
  lockToToken: boolean
  lockFromToken: boolean
  isSingleChainLocked: boolean
  lockChainId?: number
  popularChainIds?: number[]
  handleSetFromToken: (token?: Token) => void
  handleSetToToken: (token?: Token) => void
}

const SellTabContent: FC<SellTabContentProps> = ({
  slippageTolerance,
  onOpenSlippageConfig,
  onSlippageToleranceChange,
  disableInputAutoFocus,
  isUsdInputMode,
  usdInputValue,
  tradeType,
  amountInputValue,
  amountOutputValue,
  conversionRate,
  fromToken,
  toToken,
  quote,
  isFetchingQuote,
  inputAmountUsd,
  fromTokenPriceData,
  isLoadingFromTokenPrice,
  toggleInputMode,
  setUsdInputValue,
  setTradeType,
  setTokenInputCache,
  setAmountInputValue,
  setAmountOutputValue,
  setUsdOutputValue,
  debouncedAmountInputControls,
  onAnalyticEvent,
  feeBreakdown,
  fromBalance,
  isLoadingFromBalance,
  toBalance,
  isLoadingToBalance,
  toBalancePending,
  hasInsufficientBalance,
  address,
  timeEstimate,
  fromBalancePending,
  multiWalletSupportEnabled,
  fromChainWalletVMSupported,
  disablePasteWalletAddressOption,
  onSetPrimaryWallet,
  fromChain,
  toChain,
  onConnectWallet,
  onLinkNewWallet,
  linkedWallets,
  setAddressModalOpen,
  transactionModalOpen,
  depositAddressModalOpen,
  isValidFromAddress,
  isValidToAddress,
  toChainWalletVMSupported,
  isInsufficientLiquidityError,
  recipientWalletSupportsChain,
  recipient,
  setCustomToAddress,
  isRecipientLinked,
  isSameCurrencySameRecipientSwap,
  debouncedInputAmountValue,
  debouncedOutputAmountValue,
  showHighPriceImpactWarning,
  disableSwapButton,
  percentOptions,
  onSelectPercentage,
  onSelectMax,
  onPrimaryAction,
  toDisplayName,
  error,
  relayerFeeProportion,
  highRelayerServiceFee,
  isCapacityExceededError,
  isCouldNotExecuteError,
  supportsExternalLiquidity,
  recipientLinkedWallet,
  toChainVmType,
  supportedWalletVMs,
  lockToToken,
  lockFromToken,
  isSingleChainLocked,
  lockChainId,
  popularChainIds,
  handleSetFromToken,
  handleSetToToken
}) => {
  const hasSelectedTokens = Boolean(fromToken)
  const invalidAmount =
    !quote ||
    Number(debouncedInputAmountValue) === 0 ||
    Number(debouncedOutputAmountValue) === 0 ||
    !hasSelectedTokens

  const disableActionButton =
    isFetchingQuote ||
    (isValidToAddress &&
      (isValidFromAddress || !fromChainWalletVMSupported) &&
      (invalidAmount ||
        hasInsufficientBalance ||
        isInsufficientLiquidityError ||
        transactionModalOpen ||
        depositAddressModalOpen ||
        isSameCurrencySameRecipientSwap ||
        !recipientWalletSupportsChain ||
        disableSwapButton))

  const toChainId = toToken?.chainId
  const lockedToChainIds = isSingleChainLocked
    ? lockChainId !== undefined
      ? [lockChainId]
      : undefined
    : isChainLocked(toChainId, lockChainId, fromToken?.chainId, lockToToken) &&
        toChainId !== undefined
      ? [toChainId]
      : undefined

  const chainIdsFilterForTo =
    !fromChainWalletVMSupported && fromToken ? [fromToken.chainId] : undefined

  const hasValidInputAmount =
    fromToken && amountInputValue && Number(amountInputValue) > 0

  const currencyOutAmountUsd = quote?.details?.currencyOut?.amountUsd
  const currencyOutAmountFormatted =
    quote?.details?.currencyOut?.amountFormatted

  // Only show skeleton on initial load, not on subsequent fetches
  const isLoadingOutput =
    hasValidInputAmount && isFetchingQuote && toToken && !currencyOutAmountUsd

  return (
    <TabsContent value="sell">
      <SectionContainer
        css={{ backgroundColor: 'widget-background' }}
        id={'sell-token-section'}
      >
        <AmountSectionHeader
          label="Amount"
          slippageTolerance={slippageTolerance}
          onOpenSlippageConfig={onOpenSlippageConfig}
          onSlippageToleranceChange={onSlippageToleranceChange}
          onAnalyticEvent={onAnalyticEvent}
        />
        <Flex
          align="center"
          justify="between"
          css={{ gap: '2', width: '100%' }}
        >
          <AmountInput
            autoFocus={!disableInputAutoFocus}
            prefixSymbol={isUsdInputMode ? '$' : undefined}
            value={
              isUsdInputMode
                ? usdInputValue
                : tradeType === 'EXACT_INPUT'
                  ? amountInputValue
                  : amountInputValue
                    ? formatFixedLength(amountInputValue, 8)
                    : amountInputValue
            }
            setValue={(value) => {
              if (isUsdInputMode) {
                setUsdInputValue(value)
                setTradeType('EXACT_INPUT')
                setTokenInputCache('')
                if (Number(value) === 0) {
                  setAmountOutputValue('')
                  setUsdOutputValue('')
                  debouncedAmountInputControls.flush()
                }
              } else {
                setAmountInputValue(value)
                setTradeType('EXACT_INPUT')
                if (Number(value) === 0) {
                  setAmountOutputValue('')
                  debouncedAmountInputControls.flush()
                }
              }
            }}
            onFocus={() => {
              onAnalyticEvent?.(EventNames.SWAP_INPUT_FOCUSED)
            }}
            css={{
              fontWeight: '700',
              fontSize: 32,
              lineHeight: '36px',
              py: 0,
              color:
                isFetchingQuote && tradeType === 'EXPECTED_OUTPUT'
                  ? 'text-subtle'
                  : 'input-color',
              _placeholder: {
                color:
                  isFetchingQuote && tradeType === 'EXPECTED_OUTPUT'
                    ? 'text-subtle'
                    : 'input-color'
              }
            }}
          />
        </Flex>
        <Flex direction="column" css={{ gap: '3', width: '100%' }}>
          <Flex
            align="center"
            justify="between"
            css={{ gap: '3', width: '100%' }}
          >
            <AmountModeToggle
              onToggle={toggleInputMode}
              textProps={{
                css: {
                  minHeight: 18,
                  display: 'flex',
                  alignItems: 'center'
                }
              }}
            >
              {isUsdInputMode
                ? fromToken
                  ? usdInputValue && Number(usdInputValue) > 0
                    ? amountInputValue &&
                      conversionRate &&
                      !isLoadingFromTokenPrice
                      ? `${formatNumber(amountInputValue, 4, false)} ${fromToken.symbol}`
                      : '...'
                    : `0 ${fromToken.symbol}`
                  : null
                : quote?.details?.currencyIn?.amountUsd && !isFetchingQuote
                  ? formatDollar(Number(quote.details.currencyIn.amountUsd))
                  : isLoadingFromTokenPrice &&
                      amountInputValue &&
                      Number(amountInputValue) > 0
                    ? '...'
                    : inputAmountUsd &&
                        inputAmountUsd > 0 &&
                        fromTokenPriceData?.price &&
                        fromTokenPriceData.price > 0
                      ? formatDollar(inputAmountUsd)
                      : '$0.00'}
            </AmountModeToggle>
          </Flex>

          <Flex align="center" css={{ width: '100%', gap: '3' }}>
            {multiWalletSupportEnabled === true &&
            fromChainWalletVMSupported ? (
              <MultiWalletDropdown
                context="origin"
                selectedWalletAddress={address}
                disablePasteWalletAddressOption={
                  disablePasteWalletAddressOption
                }
                onSelect={(wallet) => onSetPrimaryWallet?.(wallet.address)}
                chain={fromChain}
                onLinkNewWallet={() => {
                  if (!address && fromChainWalletVMSupported) {
                    onConnectWallet?.()
                  } else {
                    onLinkNewWallet?.({
                      chain: fromChain,
                      direction: 'from'
                    })?.then((wallet) => {
                      onSetPrimaryWallet?.(wallet.address)
                    })
                  }
                }}
                setAddressModalOpen={setAddressModalOpen}
                wallets={linkedWallets ?? []}
                onAnalyticEvent={onAnalyticEvent}
                testId="origin-wallet-select-button"
              />
            ) : (
              <Box />
            )}

            <Flex
              align="center"
              css={{
                gap: '8px',
                marginLeft: 'auto',
                flexShrink: 0
              }}
            >
              {(() => {
                // In SELL mode: Always prioritize toToken (the token you're selling from URL)
                // The payment method (fromToken) is what you want to receive, not what you're spending
                // So we show the balance of what you're selling (toToken), not what you're receiving (fromToken)
                const displayToken = toToken || fromToken
                const displayBalance = toToken ? toBalance : fromBalance
                const displayBalancePending = toToken
                  ? toBalancePending
                  : fromBalancePending
                const isLoadingDisplayBalance = toToken
                  ? isLoadingToBalance
                  : isLoadingFromBalance

                return displayToken ? (
                  <BalanceDisplay
                    hideBalanceLabel={true}
                    displaySymbol={true}
                    isLoading={isLoadingDisplayBalance}
                    balance={displayBalance}
                    decimals={displayToken?.decimals}
                    symbol={displayToken?.symbol}
                    hasInsufficientBalance={hasInsufficientBalance}
                    isConnected={
                      !isDeadAddress(address) &&
                      address !== tronDeadAddress &&
                      address !== undefined
                    }
                    pending={displayBalancePending}
                    size="md"
                  />
                ) : (
                  <Flex css={{ height: 18 }} />
                )
              })()}
              <Flex align="center" css={{ gap: '1' }}>
                {(percentOptions ?? [20, 50]).map((percent) => (
                  <Button
                    key={percent}
                    aria-label={`${percent}%`}
                    css={{
                      fontSize: 12,
                      fontWeight: '500',
                      px: '1',
                      py: '1',
                      minHeight: '23px',
                      lineHeight: '100%',
                      backgroundColor: 'widget-selector-background',
                      border: 'none',
                      _hover: {
                        backgroundColor: 'widget-selector-hover-background'
                      }
                    }}
                    color="white"
                    disabled={
                      disableSwapButton ||
                      !fromBalance ||
                      fromBalance === 0n ||
                      !onSelectPercentage
                    }
                    onClick={() => {
                      if (
                        !disableSwapButton &&
                        fromBalance &&
                        fromBalance > 0n &&
                        onSelectPercentage
                      ) {
                        onSelectPercentage?.(percent)
                      }
                    }}
                  >
                    {percent}%
                  </Button>
                ))}
                <Button
                  aria-label="MAX"
                  css={{
                    fontSize: 12,
                    fontWeight: '500',
                    px: '1',
                    py: '1',
                    minHeight: '23px',
                    lineHeight: '100%',
                    backgroundColor: 'widget-selector-background',
                    border: 'none',
                    _hover: {
                      backgroundColor: 'widget-selector-hover-background'
                    }
                  }}
                  color="white"
                  disabled={
                    disableSwapButton ||
                    !fromBalance ||
                    fromBalance === 0n ||
                    !onSelectMax
                  }
                  onClick={() => {
                    if (
                      !disableSwapButton &&
                      fromBalance &&
                      fromBalance > 0n &&
                      onSelectMax
                    ) {
                      void onSelectMax?.()
                    }
                  }}
                >
                  MAX
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </Flex>

        <Divider color="gray4" />

        <Flex align="center" css={{ width: '100%', gap: '2' }}>
          <Text style="subtitle2" color="subtle">
            Sell to
          </Text>
          {multiWalletSupportEnabled && toChainWalletVMSupported ? (
            <MultiWalletDropdown
              context="destination"
              selectedWalletAddress={recipient}
              disablePasteWalletAddressOption={disablePasteWalletAddressOption}
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
                {!isValidToAddress
                  ? `Enter Address`
                  : (toDisplayName ?? recipient)}
              </Text>
            </Button>
          )}
        </Flex>

        <Flex direction="column" css={{ gap: '2', width: '100%' }}>
          <Flex justify="between" css={{ width: '100%' }}>
            <PaymentMethod
              address={address}
              isValidAddress={isValidFromAddress}
              token={toToken}
              onAnalyticEvent={onAnalyticEvent}
              multiWalletSupportEnabled={multiWalletSupportEnabled}
              fromChainWalletVMSupported={fromChainWalletVMSupported}
              supportedWalletVMs={supportedWalletVMs}
              popularChainIds={popularChainIds}
              lockedChainIds={lockedToChainIds}
              chainIdsFilter={chainIdsFilterForTo}
              context="to"
              setToken={(token) => {
                if (
                  token?.address === fromToken?.address &&
                  token?.chainId === fromToken?.chainId &&
                  address === recipient &&
                  (!lockFromToken || !toToken)
                ) {
                  handleSetToToken(fromToken)
                  handleSetFromToken(toToken)
                } else {
                  handleSetToToken(token)
                }
              }}
              trigger={
                <div style={{ width: 'max-content' }}>
                  <PaymentMethodTrigger
                    token={toToken}
                    locked={lockToToken}
                    address={address}
                    testId="destination-token-select-button"
                    balanceLabel="balance"
                  />
                </div>
              }
            />
            <FeeBreakdownInfo
              isLoading={Boolean(isLoadingOutput)}
              amountUsd={currencyOutAmountUsd}
              tokenAmountFormatted={currencyOutAmountFormatted}
              fallbackTokenAmount={amountOutputValue}
              quote={quote}
              feeBreakdown={feeBreakdown}
              token={toToken}
            />
          </Flex>
          <WidgetErrorWell
            hasInsufficientBalance={hasInsufficientBalance}
            error={error}
            quote={quote}
            currency={fromToken}
            relayerFeeProportion={relayerFeeProportion}
            isHighRelayerServiceFee={highRelayerServiceFee}
            isCapacityExceededError={isCapacityExceededError}
            isCouldNotExecuteError={isCouldNotExecuteError}
            supportsExternalLiquidity={supportsExternalLiquidity}
            recipientWalletSupportsChain={recipientWalletSupportsChain}
            recipient={recipient}
            toChainWalletVMSupported={toChainWalletVMSupported}
            recipientLinkedWallet={recipientLinkedWallet}
            toChainVmType={toChainVmType}
            containerCss={{ width: '100%' }}
          />
        </Flex>

        <Flex css={{ width: '100%' }}>
          <TokenActionButton
            onClick={() => {
              onAnalyticEvent?.('TOKEN_SELL_CLICKED', {
                token: fromToken,
                amount: amountInputValue
              })
              onPrimaryAction()
            }}
            ctaCopy="Sell"
            disabled={disableActionButton}
            isFetchingQuote={isFetchingQuote}
            hasValidAmount={!invalidAmount}
            onConnectWallet={onConnectWallet}
            address={address}
          />
        </Flex>

        <TransactionDetailsFooter
          timeEstimate={timeEstimate}
          feeBreakdown={feeBreakdown}
          quote={quote}
        />
      </SectionContainer>
    </TabsContent>
  )
}

export default SellTabContent
