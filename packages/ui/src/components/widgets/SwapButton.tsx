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
  context: 'Swap' | 'Deposit' | 'Withdraw'
  showHighPriceImpactWarning: boolean
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
  showHighPriceImpactWarning,
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

    return (
      <Button
        css={{ justifyContent: 'center' }}
        color={showHighPriceImpactWarning ? 'error' : 'primary'}
        aria-label={context}
        cta={true}
        disabled={
          isFetchingQuote ||
          (isValidToAddress &&
            (isValidFromAddress || !fromChainWalletVMSupported) &&
            (invalidAmount ||
              hasInsufficientBalance ||
              isInsufficientLiquidityError ||
              transactionModalOpen ||
              depositAddressModalOpen ||
              isSameCurrencySameRecipientSwap ||
              !recipientWalletSupportsChain))
        }
        data-testid="swap-button"
        onClick={() => {
          onClick()
        }}
      >
        {ctaCopy}
      </Button>
    )
  }

  return (
    <Button
      cta={true}
      css={{ justifyContent: 'center' }}
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
      data-testid="widget-connect-wallet-button"
    >
      Connect Wallet
    </Button>
  )
}

export default SwapButton
