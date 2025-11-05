import { TabsContent } from '../../primitives/Tabs.js'
import { Flex, Text } from '../../primitives/index.js'
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
import PaymentMethod from '../../common/TokenSelector/PaymentMethod.js'
import { EventNames } from '../../../constants/events.js'
import { isChainLocked } from '../../../utils/tokenSelector.js'
import type { Dispatch, FC, SetStateAction } from 'react'
import type { TradeType, ChildrenProps } from './widget/TokenWidgetRenderer.js'
import type { Token, LinkedWallet } from '../../../types/index.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import { isDeadAddress, tronDeadAddress } from '@relayprotocol/relay-sdk'
import SwapButton from '../SwapButton.js'
import { PaymentMethodTrigger } from '../../common/TokenSelector/triggers/PaymentMethodTrigger.js'
import AmountSectionHeader from './AmountSectionHeader.js'
import AmountModeToggle from './AmountModeToggle.js'
import TransactionDetailsFooter from './TransactionDetailsFooter.js'
import SectionContainer from './SectionContainer.js'
import { WidgetErrorWell } from '../WidgetErrorWell.js'
import { FeeBreakdownInfo } from './FeeBreakdownInfo.js'
import { DestinationWalletSelector } from './DestinationWalletSelector.js'

type LinkNewWalletHandler = (params: {
  chain?: RelayChain
  direction: 'to' | 'from'
}) => Promise<LinkedWallet> | void

type ChildrenPropsSubset = Pick<
  ChildrenProps,
  | 'quote'
  | 'isFetchingQuote'
  | 'isLoadingToTokenPrice'
  | 'toTokenPriceData'
  | 'setTradeType'
  | 'setAmountOutputValue'
  | 'setAmountInputValue'
  | 'debouncedAmountOutputControls'
  | 'feeBreakdown'
  | 'isLoadingFromBalance'
  | 'fromBalance'
  | 'fromBalancePending'
  | 'toBalance'
  | 'isLoadingToBalance'
  | 'toBalancePending'
  | 'address'
  | 'timeEstimate'
  | 'toChainWalletVMSupported'
  | 'recipient'
  | 'setCustomToAddress'
  | 'setDestinationAddressOverride'
  | 'isValidToAddress'
  | 'isRecipientLinked'
  | 'toDisplayName'
  | 'isValidFromAddress'
  | 'fromChainWalletVMSupported'
  | 'supportedWalletVMs'
  | 'transactionModalOpen'
  | 'hasInsufficientBalance'
  | 'isInsufficientLiquidityError'
  | 'recipientWalletSupportsChain'
  | 'isSameCurrencySameRecipientSwap'
  | 'debouncedInputAmountValue'
  | 'debouncedOutputAmountValue'
  | 'error'
  | 'relayerFeeProportion'
  | 'highRelayerServiceFee'
  | 'isCapacityExceededError'
  | 'isCouldNotExecuteError'
  | 'supportsExternalLiquidity'
  | 'ctaCopy'
>

type BuyTabContentProps = ChildrenPropsSubset & {
  // Slippage configuration
  slippageTolerance?: string
  onOpenSlippageConfig?: () => void
  onSlippageToleranceChange?: (value: string | undefined) => void

  // Input/output state
  isUsdInputMode: boolean
  usdOutputValue: string
  tradeType: TradeType
  amountOutputValue: string
  amountInputValue: string
  outputAmountUsd: number | null
  setUsdOutputValue: (value: string) => void
  setUsdInputValue: (value: string) => void

  // Tokens
  toToken?: Token
  fromToken?: Token
  handleSetFromToken: (token?: Token) => void
  handleSetToToken: (token?: Token) => void

  // Wallet and address management
  multiWalletSupportEnabled: boolean
  linkedWallets?: LinkedWallet[]
  onSetPrimaryWallet?: (address: string) => void
  setOriginAddressOverride: Dispatch<SetStateAction<ChildrenProps['address']>>
  setAddressModalOpen: Dispatch<SetStateAction<boolean>>
  disablePasteWalletAddressOption?: boolean

  // Chain configuration
  toChain?: RelayChain
  fromChain?: RelayChain
  lockToToken: boolean
  lockFromToken: boolean
  isSingleChainLocked: boolean
  lockChainId?: number
  popularChainIds?: number[]

  // Modal states
  depositAddressModalOpen: boolean

  // UI state and actions
  showHighPriceImpactWarning: boolean
  disableSwapButton?: boolean
  toggleInputMode: () => void
  onPrimaryAction: () => void

  // Event handlers
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onConnectWallet?: () => void
  onLinkNewWallet?: LinkNewWalletHandler

  // Additional props not covered by ChildrenProps
  recipientLinkedWallet?: LinkedWallet
  toChainVmType?: string
}

const BuyTabContent: FC<BuyTabContentProps> = ({
  slippageTolerance,
  onOpenSlippageConfig,
  onSlippageToleranceChange,
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
  isLoadingFromBalance,
  fromBalance,
  fromBalancePending,
  toBalance,
  isLoadingToBalance,
  toBalancePending,
  address,
  timeEstimate,
  multiWalletSupportEnabled,
  toChainWalletVMSupported,
  fromChain,
  disablePasteWalletAddressOption,
  recipient,
  setCustomToAddress,
  setDestinationAddressOverride,
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
  onSetPrimaryWallet,
  setOriginAddressOverride,
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
  toggleInputMode,
  onPrimaryAction,
  error,
  relayerFeeProportion,
  highRelayerServiceFee,
  isCapacityExceededError,
  isCouldNotExecuteError,
  supportsExternalLiquidity,
  recipientLinkedWallet,
  toChainVmType,
  ctaCopy
}) => {
  const displayCta = [
    'Swap',
    'Confirm',
    'Bridge',
    'Send',
    'Wrap',
    'Unwrap'
  ].includes(ctaCopy)
    ? 'Buy'
    : ctaCopy

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

  const hasSelectedTokens = Boolean(fromToken && toToken)
  const invalidAmount =
    !quote ||
    Number(debouncedInputAmountValue) === 0 ||
    Number(debouncedOutputAmountValue) === 0 ||
    !hasSelectedTokens

  const hasValidOutputAmount =
    toToken && amountOutputValue && Number(amountOutputValue) > 0

  const currencyInAmountUsd = quote?.details?.currencyIn?.amountUsd
  const currencyInAmountFormatted = quote?.details?.currencyIn?.amountFormatted

  const isLoadingPayWith =
    hasValidOutputAmount && isFetchingQuote && fromToken && !currencyInAmountUsd

  return (
    <TabsContent value="buy">
      <SectionContainer
        css={{
          backgroundColor: 'widget-background'
        }}
        id={'buy-token-section'}
      >
        <AmountSectionHeader
          label="Amount"
          slippageTolerance={slippageTolerance}
          onOpenSlippageConfig={onOpenSlippageConfig}
          onSlippageToleranceChange={onSlippageToleranceChange}
          onAnalyticEvent={onAnalyticEvent}
        />
        <Flex align="center" justify="between" css={{ width: '100%' }}>
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
            onClick={() => {
              onAnalyticEvent?.(EventNames.SWAP_OUTPUT_FOCUSED)
            }}
            css={{
              fontWeight: '700',
              fontSize: 32,
              lineHeight: '32px',
              py: 0,
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
              {isUsdInputMode
                ? toToken
                  ? usdOutputValue && Number(usdOutputValue) > 0
                    ? amountOutputValue && !isLoadingToTokenPrice
                      ? `${formatNumber(amountOutputValue, 4, false)} ${toToken.symbol}`
                      : '...'
                    : `0 ${toToken.symbol}`
                  : null
                : toToken &&
                    quote?.details?.currencyOut?.amountUsd &&
                    !isFetchingQuote
                  ? formatDollar(Number(quote.details.currencyOut.amountUsd))
                  : toToken &&
                      isLoadingToTokenPrice &&
                      amountOutputValue &&
                      Number(amountOutputValue) > 0
                    ? '...'
                    : toToken &&
                        outputAmountUsd &&
                        outputAmountUsd > 0 &&
                        toTokenPriceData?.price &&
                        toTokenPriceData.price > 0
                      ? formatDollar(outputAmountUsd)
                      : '$0.00'}
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
                  !isDeadAddress(recipient) &&
                  recipient !== tronDeadAddress &&
                  recipient !== undefined
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
          {multiWalletSupportEnabled && fromChainWalletVMSupported ? (
            <MultiWalletDropdown
              context="origin"
              disablePasteWalletAddressOption={disablePasteWalletAddressOption}
              selectedWalletAddress={address}
              onSelect={(wallet) => {
                setOriginAddressOverride(wallet.address)
                onSetPrimaryWallet?.(wallet.address)

                if (wallet.address !== address) {
                  handleSetFromToken(undefined)
                }
              }}
              chain={fromChain}
              disableWalletFiltering={true}
              onLinkNewWallet={() => {
                if (!address && fromChainWalletVMSupported) {
                  onConnectWallet?.()
                } else {
                  onLinkNewWallet?.({
                    chain: fromChain,
                    direction: 'from'
                  })?.then((wallet) => {
                    if (wallet) {
                      setOriginAddressOverride(wallet.address)
                      onSetPrimaryWallet?.(wallet.address)
                    }
                  })
                }
              }}
              setAddressModalOpen={setAddressModalOpen}
              wallets={linkedWallets ?? []}
              onAnalyticEvent={onAnalyticEvent}
              testId="origin-wallet-select-button"
            />
          ) : null}
        </Flex>

        <Flex justify="between" css={{ width: '100%' }}>
          <PaymentMethod
            address={address}
            isValidAddress={isValidFromAddress}
            token={fromToken}
            onAnalyticEvent={onAnalyticEvent}
            fromChainWalletVMSupported={fromChainWalletVMSupported}
            supportedWalletVMs={supportedWalletVMs}
            linkedWallets={linkedWallets}
            multiWalletSupportEnabled={multiWalletSupportEnabled}
            context="from"
            autoSelectToken={false}
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
            lockedChainIds={lockedChainIds}
            chainIdsFilter={
              !fromChainWalletVMSupported && toToken
                ? [toToken.chainId]
                : undefined
            }
            popularChainIds={popularChainIds}
            trigger={
              <div style={{ width: 'max-content' }}>
                <PaymentMethodTrigger
                  token={fromToken}
                  locked={lockFromToken}
                  address={address}
                  testId="origin-token-select-button"
                  balanceLabel="available"
                />
              </div>
            }
          />
          <FeeBreakdownInfo
            isLoading={Boolean(isLoadingPayWith)}
            amountUsd={currencyInAmountUsd}
            tokenAmountFormatted={currencyInAmountFormatted}
            fallbackTokenAmount={amountInputValue}
            quote={quote}
            feeBreakdown={feeBreakdown}
            token={fromToken}
          />
        </Flex>

        <Divider color="gray4" />

        <Flex direction="column" css={{ gap: '2', width: '100%' }}>
          <DestinationWalletSelector
            label="Send to"
            isMultiWalletEnabled={multiWalletSupportEnabled}
            walletSupported={toChainWalletVMSupported}
            dropdownProps={{
              disablePasteWalletAddressOption,
              selectedWalletAddress: recipient,
              onSelect: (wallet) => {
                setDestinationAddressOverride(wallet.address)
                setCustomToAddress(undefined)
              },
              chain: toChain,
              disableWalletFiltering: false,
              onLinkNewWallet: () => {
                if (!address && toChainWalletVMSupported) {
                  onConnectWallet?.()
                } else {
                  onLinkNewWallet?.({
                    chain: toChain,
                    direction: 'to'
                  })?.then((wallet) => {
                    if (!wallet) {
                      return
                    }
                    setDestinationAddressOverride(wallet.address)
                    setCustomToAddress(undefined)
                  })
                }
              },
              setAddressModalOpen,
              wallets: linkedWallets ?? [],
              onAnalyticEvent,
              testId: 'destination-wallet-select-button'
            }}
            fallback={{
              highlighted: Boolean(
                isValidToAddress &&
                  multiWalletSupportEnabled &&
                  !isRecipientLinked
              ),
              text: !isValidToAddress ? 'Enter Address' : (toDisplayName ?? ''),
              onClick: () => {
                setDestinationAddressOverride(undefined)
                setAddressModalOpen(true)
                onAnalyticEvent?.(EventNames.SWAP_ADDRESS_MODAL_CLICKED)
              },
              showClipboard: Boolean(
                isValidToAddress &&
                  multiWalletSupportEnabled &&
                  !isRecipientLinked
              )
            }}
          />
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
          <SwapButton
            context="Buy"
            transactionModalOpen={transactionModalOpen}
            depositAddressModalOpen={depositAddressModalOpen}
            showHighPriceImpactWarning={showHighPriceImpactWarning}
            disableSwapButton={disableSwapButton}
            tokenWidgetMode={true}
            hasValidAmount={!invalidAmount}
            quote={quote}
            address={address}
            hasInsufficientBalance={hasInsufficientBalance}
            isInsufficientLiquidityError={isInsufficientLiquidityError}
            debouncedInputAmountValue={debouncedInputAmountValue}
            debouncedOutputAmountValue={debouncedOutputAmountValue}
            isSameCurrencySameRecipientSwap={isSameCurrencySameRecipientSwap}
            ctaCopy={displayCta}
            isValidFromAddress={isValidFromAddress}
            isValidToAddress={isValidToAddress}
            fromChainWalletVMSupported={fromChainWalletVMSupported}
            recipientWalletSupportsChain={recipientWalletSupportsChain}
            isFetchingQuote={isFetchingQuote}
            onClick={() => {
              onAnalyticEvent?.('TOKEN_BUY_CLICKED', {
                token: toToken,
                amount: amountOutputValue
              })
              onPrimaryAction()
            }}
            onConnectWallet={onConnectWallet}
            onAnalyticEvent={onAnalyticEvent}
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

export default BuyTabContent
