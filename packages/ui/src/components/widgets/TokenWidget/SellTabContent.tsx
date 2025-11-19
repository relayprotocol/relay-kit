import { TabsContent } from '../../primitives/Tabs.js'
import { Flex, Box } from '../../primitives/index.js'
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
import { useMemo, useRef, useEffect } from 'react'
import type { Dispatch, FC, SetStateAction } from 'react'
import type { TradeType, ChildrenProps } from './widget/TokenWidgetRenderer.js'
import type { Token, LinkedWallet } from '../../../types/index.js'
import {
  isDeadAddress,
  tronDeadAddress,
  type RelayChain,
  type ChainVM
} from '@relayprotocol/relay-sdk'
import SwapButton from '../SwapButton.js'
import { BalanceDisplay } from '../../common/BalanceDisplay.js'
import AmountSectionHeader from './AmountSectionHeader.js'
import AmountModeToggle from './AmountModeToggle.js'
import TransactionDetailsFooter from './TransactionDetailsFooter.js'
import SectionContainer from './SectionContainer.js'
import { WidgetErrorWell } from '../WidgetErrorWell.js'
import { FeeBreakdownInfo } from './FeeBreakdownInfo.js'
import { DestinationWalletSelector } from './DestinationWalletSelector.js'
import { PercentageButtons } from '../../common/PercentageButtons.js'
import type { PublicClient } from 'viem'

type LinkNewWalletHandler = (params: {
  chain?: RelayChain
  direction: 'to' | 'from'
}) => Promise<LinkedWallet> | void

type SellChildrenPropsSubset = Pick<
  ChildrenProps,
  | 'quote'
  | 'isFetchingQuote'
  | 'fromTokenPriceData'
  | 'isLoadingFromTokenPrice'
  | 'setTradeType'
  | 'setAmountInputValue'
  | 'setAmountOutputValue'
  | 'debouncedAmountInputControls'
  | 'feeBreakdown'
  | 'fromBalance'
  | 'isLoadingFromBalance'
  | 'toBalance'
  | 'isLoadingToBalance'
  | 'toBalancePending'
  | 'hasInsufficientBalance'
  | 'address'
  | 'timeEstimate'
  | 'fromBalancePending'
  | 'fromChainWalletVMSupported'
  | 'transactionModalOpen'
  | 'isValidFromAddress'
  | 'isValidToAddress'
  | 'toChainWalletVMSupported'
  | 'isInsufficientLiquidityError'
  | 'recipientWalletSupportsChain'
  | 'recipient'
  | 'setCustomToAddress'
  | 'setDestinationAddressOverride'
  | 'isRecipientLinked'
  | 'isSameCurrencySameRecipientSwap'
  | 'debouncedInputAmountValue'
  | 'debouncedOutputAmountValue'
  | 'toDisplayName'
  | 'error'
  | 'relayerFeeProportion'
  | 'highRelayerServiceFee'
  | 'isCapacityExceededError'
  | 'isCouldNotExecuteError'
  | 'supportsExternalLiquidity'
  | 'supportedWalletVMs'
  | 'ctaCopy'
>

type SellTabContentProps = SellChildrenPropsSubset & {
  // Slippage configuration
  slippageTolerance?: string
  onOpenSlippageConfig?: () => void
  onSlippageToleranceChange?: (value: string | undefined) => void

  // Input/output state
  isUsdInputMode: boolean
  usdInputValue: string
  tradeType: TradeType
  amountInputValue: string
  amountOutputValue: string
  conversionRate: number | null
  inputAmountUsd: number | null
  toggleInputMode: () => void
  setUsdInputValue: (value: string) => void
  setTokenInputCache: (value: string) => void
  setUsdOutputValue: (value: string) => void

  // Tokens
  fromToken?: Token
  toToken?: Token
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
  fromChain?: RelayChain
  toChain?: RelayChain
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
  percentOptions?: number[]
  onMaxAmountClicked?: (
    amount: bigint,
    label: string,
    feeBuffer?: bigint
  ) => void
  onPrimaryAction: () => void
  publicClient?: PublicClient | null
  isFromNative?: boolean
  getFeeBufferAmount?: (
    vmType: ChainVM | undefined | null,
    chainId: number | undefined | null,
    balance: bigint,
    publicClient: PublicClient | null
  ) => Promise<bigint>

  // Event handlers
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onConnectWallet?: () => void
  onLinkNewWallet?: LinkNewWalletHandler

  // Additional props not covered by ChildrenProps
  recipientLinkedWallet?: LinkedWallet
  toChainVmType?: string
}

const SellTabContent: FC<SellTabContentProps> = ({
  slippageTolerance,
  onOpenSlippageConfig,
  onSlippageToleranceChange,
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
  setOriginAddressOverride,
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
  setDestinationAddressOverride,
  isRecipientLinked,
  isSameCurrencySameRecipientSwap,
  debouncedInputAmountValue,
  debouncedOutputAmountValue,
  showHighPriceImpactWarning,
  disableSwapButton,
  percentOptions,
  onMaxAmountClicked,
  publicClient,
  isFromNative,
  getFeeBufferAmount,
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
  handleSetToToken,
  ctaCopy
}) => {
  const selectedPaymentVmType = useMemo(
    () => toChain?.vmType ?? toChainVmType,
    [toChain, toChainVmType]
  )
  const recipientVmType = recipientLinkedWallet?.vmType

  // Keep a ref to track the current toToken to avoid infinite loops
  const toTokenRef = useRef(toToken)
  toTokenRef.current = toToken

  const hasAutoSelectedDestination = useRef(false)

  // Auto-select the user's primary wallet as the destination for selling
  useEffect(() => {
    if (
      !hasAutoSelectedDestination.current &&
      multiWalletSupportEnabled &&
      address &&
      isValidFromAddress &&
      !recipient
    ) {
      setDestinationAddressOverride(address)
      hasAutoSelectedDestination.current = true
    }
  }, [
    multiWalletSupportEnabled,
    address,
    isValidFromAddress,
    recipient,
    setDestinationAddressOverride
  ])

  // Smart auto-selection for destination token when selling to same wallet
  useEffect(() => {
    if (
      recipient === address &&
      fromToken &&
      !toToken &&
      isValidToAddress &&
      multiWalletSupportEnabled
    ) {
      // let user manually select the destination token
    }
  }, [
    recipient,
    address,
    fromToken,
    toToken,
    isValidToAddress,
    multiWalletSupportEnabled
  ])

  const displayCta = [
    'Swap',
    'Confirm',
    'Bridge',
    'Send',
    'Wrap',
    'Unwrap'
  ].includes(ctaCopy)
    ? 'Sell'
    : ctaCopy

  const hasSelectedTokens = Boolean(fromToken)
  const invalidAmount =
    !quote ||
    Number(debouncedInputAmountValue) === 0 ||
    Number(debouncedOutputAmountValue) === 0 ||
    !hasSelectedTokens

  const chainIdsFilterForDestination =
    !toChainWalletVMSupported && fromToken ? [fromToken.chainId] : undefined

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
        css={{
          border: { base: 'none', md: '1px solid' },
          borderColor: { base: 'transparent', md: 'slate.4' },
          minWidth: { base: '350px', md: '400px' },
          maxWidth: '400px'
        }}
        id={'sell-token-section'}
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
            onClick={() => {
              onAnalyticEvent?.(EventNames.SWAP_INPUT_FOCUSED)
            }}
            css={{
              fontWeight: '700',
              fontSize: 32,
              lineHeight: '32px',
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
            {multiWalletSupportEnabled === true ? (
              <MultiWalletDropdown
                context="origin"
                selectedWalletAddress={address}
                disablePasteWalletAddressOption={
                  disablePasteWalletAddressOption
                }
                onSelect={(wallet) => {
                  setOriginAddressOverride(wallet.address)
                  onSetPrimaryWallet?.(wallet.address)
                }}
                chain={fromChain}
                disableWalletFiltering={false}
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
                const displayToken = fromToken || toToken
                const displayBalance = fromToken
                  ? fromBalance
                  : toToken && recipient !== address
                    ? fromBalance
                    : toBalance
                const displayBalancePending = fromToken
                  ? fromBalancePending
                  : toToken && recipient !== address
                    ? fromBalancePending
                    : toBalancePending
                const isLoadingDisplayBalance = fromToken
                  ? isLoadingFromBalance
                  : toToken && recipient !== address
                    ? isLoadingFromBalance
                    : isLoadingToBalance

                return displayToken ? (
                  <BalanceDisplay
                    hideBalanceLabel={false}
                    displaySymbol={false}
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
                    size="sm"
                  />
                ) : (
                  <Flex css={{ height: 18 }} />
                )
              })()}
              {/* Desktop Percentage Buttons - Hidden on Mobile */}
              {fromBalance && fromBalance > 0n && onMaxAmountClicked ? (
                <Box
                  css={{
                    display: 'none',
                    sm: { display: 'block' }
                  }}
                >
                  <PercentageButtons
                    balance={fromBalance}
                    onPercentageClick={onMaxAmountClicked}
                    getFeeBufferAmount={getFeeBufferAmount}
                    fromChain={fromChain}
                    publicClient={publicClient}
                    isFromNative={isFromNative}
                    percentages={percentOptions}
                    variant="desktop"
                  />
                </Box>
              ) : null}
            </Flex>
          </Flex>

          {/* Mobile Percentage Buttons - Hidden on Desktop */}
          {fromBalance && fromBalance > 0n && onMaxAmountClicked ? (
            <Box css={{ display: 'block', sm: { display: 'none' } }}>
              <PercentageButtons
                balance={fromBalance}
                onPercentageClick={onMaxAmountClicked}
                getFeeBufferAmount={getFeeBufferAmount}
                fromChain={fromChain}
                publicClient={publicClient}
                isFromNative={isFromNative}
                percentages={percentOptions}
                variant="mobile"
              />
            </Box>
          ) : null}
        </Flex>

        <Divider color="gray4" />

        <DestinationWalletSelector
          label="Sell to"
          isMultiWalletEnabled={multiWalletSupportEnabled}
          walletSupported={toChainWalletVMSupported}
          dropdownProps={{
            selectedWalletAddress: recipient,
            disablePasteWalletAddressOption,
            onSelect: (wallet) => {
              setDestinationAddressOverride(wallet.address)
              setCustomToAddress(undefined)
              handleSetToToken(undefined)
            },
            chain: toChain,
            disableWalletFiltering: true,
            onLinkNewWallet: () => {
              if (!address && toChainWalletVMSupported) {
                onConnectWallet?.()
              } else {
                onLinkNewWallet?.({
                  chain: toChain,
                  direction: 'to'
                })?.then((wallet) => {
                  if (!wallet) return
                  setDestinationAddressOverride(wallet.address)
                  setCustomToAddress(undefined)
                  // Always reset payment method when linking new wallets (like buy tab)
                  handleSetToToken(undefined)
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
            text: !isValidToAddress
              ? 'Enter Address'
              : (toDisplayName ?? recipient ?? 'Select wallet'),
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

        <Flex direction="column" css={{ gap: '2', width: '100%' }}>
          <Flex align="center" css={{ width: '100%', gap: '32px' }}>
            <PaymentMethod
              address={recipient}
              isValidAddress={isValidToAddress}
              token={toToken}
              onAnalyticEvent={onAnalyticEvent}
            multiWalletSupportEnabled={multiWalletSupportEnabled}
            fromChainWalletVMSupported={toChainWalletVMSupported}
            supportedWalletVMs={supportedWalletVMs}
            popularChainIds={popularChainIds}
            chainIdsFilter={chainIdsFilterForDestination}
            linkedWallets={linkedWallets}
            context="to"
            setToken={(token) => {
              if (
                token?.address === fromToken?.address &&
                token?.chainId === fromToken?.chainId &&
                recipient === address
                ) {
                  return
                }
                handleSetToToken(token)
              }}
              trigger={
                <div>
                  <PaymentMethodTrigger
                    token={toToken}
                    address={recipient}
                    testId="payment-method-select-button"
                    balanceLabel="balance"
                  />
                </div>
              }
            />
            <Flex css={{ marginLeft: 'auto' }}>
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
            containerCss={{ width: '100%', marginBottom: 0 }}
          />
        </Flex>

        <Flex css={{ width: '100%' }}>
          <SwapButton
            context="Sell"
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
              onAnalyticEvent?.('TOKEN_SELL_CLICKED', {
                token: fromToken,
                amount: amountInputValue
              })
              onPrimaryAction()
            }}
            onConnectWallet={onConnectWallet}
            onAnalyticEvent={onAnalyticEvent}
          />
        </Flex>

        <Flex css={{ width: '100%', marginTop: '-8px' }}>
          <TransactionDetailsFooter
            timeEstimate={timeEstimate}
            feeBreakdown={feeBreakdown}
            quote={quote}
          />
        </Flex>
      </SectionContainer>
    </TabsContent>
  )
}

export default SellTabContent
