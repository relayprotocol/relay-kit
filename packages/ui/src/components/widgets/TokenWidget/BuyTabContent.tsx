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
import PaymentMethod from '../../common/TokenSelector/PaymentMethod.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboard } from '@fortawesome/free-solid-svg-icons'
import { EventNames } from '../../../constants/events.js'
import { isChainLocked } from '../../../utils/tokenSelector.js'
import type { Dispatch, FC, SetStateAction } from 'react'
import type { TradeType, ChildrenProps } from './TokenWidgetRenderer.js'
import type { Token, LinkedWallet } from '../../../types/index.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import { isDeadAddress, tronDeadAddress } from '@relayprotocol/relay-sdk'
import TokenActionButton from './TokenActionButton.js'
import { PaymentMethodTrigger } from '../../common/TokenSelector/triggers/PaymentMethodTrigger.js'
import AmountSectionHeader from './AmountSectionHeader.js'
import AmountModeToggle from './AmountModeToggle.js'
import TransactionDetailsFooter from './TransactionDetailsFooter.js'
import SectionContainer from './SectionContainer.js'
import { WidgetErrorWell } from '../WidgetErrorWell.js'
import { FeeBreakdownInfo } from './FeeBreakdownInfo.js'

type LinkNewWalletHandler = (params: {
  chain?: RelayChain
  direction: 'to' | 'from'
}) => Promise<LinkedWallet> | void

type BuyTabContentProps = {
  slippageTolerance?: string
  onOpenSlippageConfig?: () => void
  onSlippageToleranceChange?: (value: string | undefined) => void
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
  isLoadingFromBalance: ChildrenProps['isLoadingFromBalance']
  fromBalance: ChildrenProps['fromBalance']
  fromBalancePending: ChildrenProps['fromBalancePending']
  toBalance: ChildrenProps['toBalance']
  isLoadingToBalance: ChildrenProps['isLoadingToBalance']
  toBalancePending: ChildrenProps['toBalancePending']
  address: ChildrenProps['address']
  timeEstimate?: ChildrenProps['timeEstimate']
  multiWalletSupportEnabled: boolean
  toChainWalletVMSupported: ChildrenProps['toChainWalletVMSupported']
  disablePasteWalletAddressOption?: boolean
  recipient: ChildrenProps['recipient']
  setCustomToAddress: ChildrenProps['setCustomToAddress']
  onConnectWallet?: () => void
  onLinkNewWallet?: LinkNewWalletHandler
  linkedWallets?: LinkedWallet[]
  toChain?: RelayChain
  fromChain?: RelayChain
  isValidToAddress: ChildrenProps['isValidToAddress']
  isRecipientLinked?: ChildrenProps['isRecipientLinked']
  setAddressModalOpen: Dispatch<SetStateAction<boolean>>
  toDisplayName?: ChildrenProps['toDisplayName']
  isValidFromAddress: ChildrenProps['isValidFromAddress']
  fromChainWalletVMSupported: ChildrenProps['fromChainWalletVMSupported']
  supportedWalletVMs: ChildrenProps['supportedWalletVMs']
  handleSetFromToken: (token?: Token) => void
  handleSetToToken: (token?: Token) => void
  onSetPrimaryWallet?: (address: string) => void
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
  onPrimaryAction: () => void
  error: ChildrenProps['error']
  relayerFeeProportion: ChildrenProps['relayerFeeProportion']
  highRelayerServiceFee: ChildrenProps['highRelayerServiceFee']
  isCapacityExceededError?: ChildrenProps['isCapacityExceededError']
  isCouldNotExecuteError?: ChildrenProps['isCouldNotExecuteError']
  supportsExternalLiquidity: ChildrenProps['supportsExternalLiquidity']
  recipientLinkedWallet?: ChildrenProps['linkedWallet']
  toChainVmType?: string
  ctaCopy: ChildrenProps['ctaCopy']
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

  // Only show skeleton on initial load, not on subsequent fetches
  const isLoadingPayWith =
    hasValidOutputAmount && isFetchingQuote && fromToken && !currencyInAmountUsd

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
          onSlippageToleranceChange={onSlippageToleranceChange}
          onAnalyticEvent={onAnalyticEvent}
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
            onClick={() => {
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
                if (
                  fromToken &&
                  fromChain &&
                  wallet.vmType !== fromChain.vmType
                ) {
                  handleSetFromToken(undefined)
                }
                onSetPrimaryWallet?.(wallet.address)
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
                    onSetPrimaryWallet?.(wallet.address)
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
          <Flex align="center" css={{ width: '100%', gap: '2' }}>
            <Text style="subtitle2" color="subtle">
              Send to
            </Text>
            {multiWalletSupportEnabled && toChainWalletVMSupported ? (
              <MultiWalletDropdown
                context="destination"
                disablePasteWalletAddressOption={
                  disablePasteWalletAddressOption
                }
                selectedWalletAddress={recipient}
                onSelect={(wallet) => {
                  // If wallet is incompatible with current receive token, clear it
                  if (toToken && toChain && wallet.vmType !== toChain.vmType) {
                    handleSetToToken(undefined)
                  }
                  setCustomToAddress(wallet.address)
                }}
                chain={toChain}
                disableWalletFiltering={true}
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
                    <FontAwesomeIcon
                      icon={faClipboard}
                      width={16}
                      height={16}
                    />
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
              onAnalyticEvent?.('TOKEN_BUY_CLICKED', {
                token: toToken,
                amount: amountOutputValue
              })
              onPrimaryAction()
            }}
            ctaCopy={displayCta}
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

export default BuyTabContent
