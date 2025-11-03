import { type FC } from 'react'
import { Button } from '../primitives/index.js'
import { useMounted } from '../../hooks/index.js'
import type { ChildrenProps } from './SwapWidgetRenderer.js'
import { EventNames } from '../../constants/events.js'

type SwapButtonProps = {
  transactionModalOpen: boolean
  depositAddressModalOpen: boolean
  onConnectWallet?: () => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onClick: () => void
  context: 'Swap' | 'Deposit' | 'Withdraw' | 'Buy' | 'Sell'
  showHighPriceImpactWarning?: boolean
  disableSwapButton?: boolean
  tokenWidgetMode?: boolean
  hasValidAmount?: boolean
} & Pick<
  ChildrenProps,
  | 'quote'
  | 'address'
  | 'hasInsufficientBalance'
  | 'isInsufficientLiquidityError'
  | 'debouncedInputAmountValue'
  | 'debouncedOutputAmountValue'
  | 'isSameCurrencySameRecipientSwap'
  | 'ctaCopy'
  | 'isValidFromAddress'
  | 'isValidToAddress'
  | 'fromChainWalletVMSupported'
  | 'recipientWalletSupportsChain'
  | 'isFetchingQuote'
>

const SwapButton: FC<SwapButtonProps> = ({
  transactionModalOpen,
  depositAddressModalOpen,
  isValidFromAddress,
  isValidToAddress,
  context,
  showHighPriceImpactWarning = false,
  disableSwapButton = false,
  tokenWidgetMode = false,
  hasValidAmount = true,
  onConnectWallet,
  quote,
  address,
  hasInsufficientBalance,
  isInsufficientLiquidityError,
  debouncedInputAmountValue,
  debouncedOutputAmountValue,
  isSameCurrencySameRecipientSwap,
  fromChainWalletVMSupported,
  recipientWalletSupportsChain,
  onClick,
  ctaCopy,
  onAnalyticEvent,
  isFetchingQuote
}) => {
  const isMounted = useMounted()

  if (isMounted && (address || !fromChainWalletVMSupported)) {
    const invalidAmount =
      !quote ||
      Number(debouncedInputAmountValue) === 0 ||
      Number(debouncedOutputAmountValue) === 0
    
    const isWalletSelectionPrompt =
      tokenWidgetMode && (ctaCopy.includes('Select') || ctaCopy.includes('Enter'))
    const isSelectTokenPrompt = tokenWidgetMode && ctaCopy === 'Select a token'
    
    const buttonDisabled = tokenWidgetMode
      ? (disableSwapButton ||
         isFetchingQuote ||
         isSelectTokenPrompt ||
         (!isWalletSelectionPrompt && !hasValidAmount))
      : (isFetchingQuote ||
         (isValidToAddress &&
           (isValidFromAddress || !fromChainWalletVMSupported) &&
           (invalidAmount ||
             hasInsufficientBalance ||
             isInsufficientLiquidityError ||
             transactionModalOpen ||
             depositAddressModalOpen ||
             isSameCurrencySameRecipientSwap ||
             !recipientWalletSupportsChain ||
             disableSwapButton)))
    
    const buttonLabel = tokenWidgetMode && isFetchingQuote && hasValidAmount
      ? 'Fetching quote'
      : ctaCopy

    return (
      <Button
        css={{
          justifyContent: 'center',
          width: tokenWidgetMode ? '100%' : undefined,
          textTransform: tokenWidgetMode ? 'uppercase' : undefined,
          fontFamily: tokenWidgetMode ? 'heading' : undefined,
          fontWeight: tokenWidgetMode ? 700 : undefined,
          fontStyle: tokenWidgetMode ? 'var(--relay-fonts-button-cta-font-style, italic)' : undefined
        }}
        color={showHighPriceImpactWarning ? 'error' : 'primary'}
        aria-label={context}
        cta={true}
        disabled={buttonDisabled}
        data-testid={tokenWidgetMode ? "token-action-button" : "swap-button"}
        onClick={() => {
          if (!buttonDisabled) {
            onClick()
          }
        }}
      >
        {buttonLabel}
      </Button>
    )
  }

  return (
    <Button
      cta={true}
      css={{
        justifyContent: 'center',
        width: tokenWidgetMode ? '100%' : undefined,
        textTransform: tokenWidgetMode ? 'uppercase' : undefined,
        fontFamily: tokenWidgetMode ? 'heading' : undefined,
        fontWeight: tokenWidgetMode ? 700 : undefined,
        fontStyle: tokenWidgetMode ? 'var(--relay-fonts-button-cta-font-style, italic)' : undefined
      }}
      aria-label="Connect wallet"
      onClick={() => {
        if (!onConnectWallet) {
          throw 'Missing onWalletConnect function'
        }

        onConnectWallet()
        onAnalyticEvent?.(EventNames.CONNECT_WALLET_CLICKED, {
          context
        })
      }}
      data-testid={tokenWidgetMode ? "token-widget-connect-wallet-button" : "widget-connect-wallet-button"}
    >
      Connect Wallet
    </Button>
  )
}

export default SwapButton
