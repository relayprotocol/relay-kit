import { TabsContent } from '../../primitives/Tabs.js'
import { Flex, Text, Button, Box } from '../../primitives/index.js'
import TokenSelectorContainer from '../TokenSelectorContainer.js'
import AmountInput from '../../common/AmountInput.js'
import {
  formatFixedLength,
  formatNumber,
  formatDollar
} from '../../../utils/numbers.js'
import { EventNames } from '../../../constants/events.js'
import { Divider } from '@relayprotocol/relay-design-system/jsx'
import { MultiWalletDropdown } from '../../common/MultiWalletDropdown.js'
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

type LinkNewWalletHandler = (params: {
  chain?: RelayChain
  direction: 'to' | 'from'
}) => Promise<LinkedWallet> | void

type SellTabContentProps = {
  slippageTolerance?: string
  onOpenSlippageConfig?: () => void
  disableInputAutoFocus: boolean
  isUsdInputMode: boolean
  usdInputValue: string
  tradeType: TradeType
  amountInputValue: string
  amountOutputValue: string
  conversionRate: number | null
  fromToken?: Token
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
  fromBalance: ChildrenProps['fromBalance']
  isLoadingFromBalance: ChildrenProps['isLoadingFromBalance']
  hasInsufficientBalance: ChildrenProps['hasInsufficientBalance']
  address: ChildrenProps['address']
  fromBalancePending: ChildrenProps['fromBalancePending']
  multiWalletSupportEnabled: boolean
  fromChainWalletVMSupported: ChildrenProps['fromChainWalletVMSupported']
  disablePasteWalletAddressOption?: boolean
  onSetPrimaryWallet?: (address: string) => void
  fromChain?: RelayChain
  onConnectWallet?: () => void
  onLinkNewWallet?: LinkNewWalletHandler
  linkedWallets?: LinkedWallet[]
  setAddressModalOpen: Dispatch<SetStateAction<boolean>>
  transactionModalOpen: ChildrenProps['transactionModalOpen']
  depositAddressModalOpen: boolean
  isValidFromAddress: ChildrenProps['isValidFromAddress']
  isValidToAddress: ChildrenProps['isValidToAddress']
  isInsufficientLiquidityError?: ChildrenProps['isInsufficientLiquidityError']
  recipientWalletSupportsChain: ChildrenProps['recipientWalletSupportsChain']
  isSameCurrencySameRecipientSwap: ChildrenProps['isSameCurrencySameRecipientSwap']
  debouncedInputAmountValue: ChildrenProps['debouncedInputAmountValue']
  debouncedOutputAmountValue: ChildrenProps['debouncedOutputAmountValue']
  showHighPriceImpactWarning: boolean
  disableSwapButton?: boolean
  percentOptions?: number[]
  onSelectPercentage?: (percent: number) => void
  onSelectMax?: () => void | Promise<void>
}

const SellTabContent: FC<SellTabContentProps> = ({
  slippageTolerance,
  onOpenSlippageConfig,
  disableInputAutoFocus,
  isUsdInputMode,
  usdInputValue,
  tradeType,
  amountInputValue,
  amountOutputValue,
  conversionRate,
  fromToken,
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
  fromBalance,
  isLoadingFromBalance,
  hasInsufficientBalance,
  address,
  fromBalancePending,
  multiWalletSupportEnabled,
  fromChainWalletVMSupported,
  disablePasteWalletAddressOption,
  onSetPrimaryWallet,
  fromChain,
  onConnectWallet,
  onLinkNewWallet,
  linkedWallets,
  setAddressModalOpen,
  transactionModalOpen,
  depositAddressModalOpen,
  isValidFromAddress,
  isValidToAddress,
  isInsufficientLiquidityError,
  recipientWalletSupportsChain,
  isSameCurrencySameRecipientSwap,
  debouncedInputAmountValue,
  debouncedOutputAmountValue,
  showHighPriceImpactWarning,
  disableSwapButton,
  percentOptions,
  onSelectPercentage,
  onSelectMax
}) => (
  <TabsContent value="sell">
    <TokenSelectorContainer
      css={{ backgroundColor: 'widget-background' }}
      id={'sell-token-section'}
    >
      <AmountSectionHeader
        label="Amount"
        slippageTolerance={slippageTolerance}
        onOpenSlippageConfig={onOpenSlippageConfig}
      />
      <Flex align="center" justify="between" css={{ gap: '2', width: '100%' }}>
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
            {isUsdInputMode ? (
              fromToken ? (
                usdInputValue && Number(usdInputValue) > 0 ? (
                  amountInputValue &&
                  conversionRate &&
                  !isLoadingFromTokenPrice ? (
                    `${formatNumber(amountInputValue, 4, false)} ${fromToken.symbol}`
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
                  `0 ${fromToken.symbol}`
                )
              ) : null
            ) : quote?.details?.currencyIn?.amountUsd && !isFetchingQuote ? (
              formatDollar(Number(quote.details.currencyIn.amountUsd))
            ) : isLoadingFromTokenPrice &&
              amountInputValue &&
              Number(amountInputValue) > 0 ? (
              <Box
                css={{
                  width: 45,
                  height: 12,
                  backgroundColor: 'gray7',
                  borderRadius: 'widget-border-radius'
                }}
              />
            ) : inputAmountUsd &&
              inputAmountUsd > 0 &&
              fromTokenPriceData?.price &&
              fromTokenPriceData.price > 0 ? (
              formatDollar(inputAmountUsd)
            ) : (
              '$0.00'
            )}
          </AmountModeToggle>
        </Flex>

        <Flex align="center" css={{ width: '100%', gap: '3' }}>
          {multiWalletSupportEnabled === true && fromChainWalletVMSupported ? (
            <MultiWalletDropdown
              context="origin"
              selectedWalletAddress={address}
              disablePasteWalletAddressOption={disablePasteWalletAddressOption}
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
            {fromToken ? (
              <BalanceDisplay
                hideBalanceLabel={true}
                displaySymbol={true}
                isLoading={isLoadingFromBalance}
                balance={fromBalance}
                decimals={fromToken?.decimals}
                symbol={fromToken?.symbol}
                hasInsufficientBalance={hasInsufficientBalance}
                isConnected={
                  !isDeadAddress(address) &&
                  address !== tronDeadAddress &&
                  address !== undefined
                }
                pending={fromBalancePending}
                size="md"
              />
            ) : (
              <Flex css={{ height: 18 }} />
            )}
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
        {multiWalletSupportEnabled === true && fromChainWalletVMSupported ? (
          <MultiWalletDropdown
            context="origin"
            selectedWalletAddress={address}
            disablePasteWalletAddressOption={disablePasteWalletAddressOption}
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
        ) : null}
      </Flex>

      <Flex css={{ width: '100%' }}>
        <TokenActionButton
          onClick={() => {
            const token = fromToken
            const amount = amountInputValue
            console.log(`Selling ${token?.symbol}`, {
              token,
              amount
            })
            onAnalyticEvent?.('TOKEN_SELL_CLICKED', {
              token,
              amount
            })
          }}
          ctaCopy="Sell"
          disabled={
            !fromToken ||
            hasInsufficientBalance ||
            transactionModalOpen ||
            depositAddressModalOpen ||
            !isValidFromAddress
          }
          isFetchingQuote={isFetchingQuote}
          hasValidAmount={
            !!quote &&
            Number(debouncedInputAmountValue) > 0 &&
            Number(debouncedOutputAmountValue) > 0
          }
          onConnectWallet={onConnectWallet}
          address={address}
        />
      </Flex>

      <TransactionDetailsFooter />
    </TokenSelectorContainer>
  </TabsContent>
)

export default SellTabContent
