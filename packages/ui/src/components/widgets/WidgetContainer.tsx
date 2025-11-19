import { type FC, type ReactNode } from 'react'
import { CustomAddressModal } from '../common/CustomAddressModal.js'
import { TransactionModal } from '../common/TransactionModal/TransactionModal.js'
import { DepositAddressModal } from '../common/TransactionModal/DepositAddressModal.js'
import { useMounted } from '../../hooks/index.js'
import type { ChildrenProps } from './SwapWidgetRenderer.js'
import type {
  RelayChain,
  AdaptedWallet,
  Execute
} from '@relayprotocol/relay-sdk'
import { useAccount } from 'wagmi'
import type { LinkedWallet } from '../../types/index.js'

export type WidgetContainerProps = {
  steps: Execute['steps'] | null
  transactionModalOpen: boolean
  depositAddressModalOpen: boolean
  addressModalOpen: boolean
  toChain?: RelayChain
  fromChain?: RelayChain
  wallet?: AdaptedWallet
  linkedWallets?: LinkedWallet[]
  multiWalletSupportEnabled?: boolean
  setTransactionModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDepositAddressModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  setAddressModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  children: () => ReactNode
  onTransactionModalOpenChange: (open: boolean) => void
  onDepositAddressModalOpenChange: (open: boolean) => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onSwapSuccess?: (data: Execute) => void
  onSwapValidating?: (data: Execute) => void
  invalidateBalanceQueries: () => void
  invalidateQuoteQuery: () => void
} & Pick<
  ChildrenProps,
  | 'fromToken'
  | 'toToken'
  | 'amountInputValue'
  | 'amountOutputValue'
  | 'debouncedInputAmountValue'
  | 'debouncedOutputAmountValue'
  | 'recipient'
  | 'customToAddress'
  | 'tradeType'
  | 'address'
  | 'setCustomToAddress'
  | 'timeEstimate'
  | 'slippageTolerance'
  | 'setSteps'
  | 'swapError'
  | 'setSwapError'
  | 'quoteInProgress'
  | 'setQuoteInProgress'
>

const WidgetContainer: FC<WidgetContainerProps> = ({
  steps,
  setSteps,
  quoteInProgress,
  setQuoteInProgress,
  transactionModalOpen,
  setTransactionModalOpen,
  depositAddressModalOpen,
  setDepositAddressModalOpen,
  addressModalOpen,
  setAddressModalOpen,
  children,
  fromChain,
  fromToken,
  toToken,
  debouncedInputAmountValue,
  debouncedOutputAmountValue,
  customToAddress,
  address,
  slippageTolerance,
  timeEstimate,
  recipient,
  toChain,
  wallet,
  linkedWallets,
  multiWalletSupportEnabled,
  swapError,
  setSwapError,
  onTransactionModalOpenChange,
  onDepositAddressModalOpenChange,
  onSwapSuccess,
  onSwapValidating,
  onAnalyticEvent,
  invalidateBalanceQueries,
  invalidateQuoteQuery,
  setCustomToAddress
}) => {
  const isMounted = useMounted()
  const { isConnected } = useAccount()

  return (
    <div className="relay-kit-reset">
      {children()}
      {isMounted ? (
        <>
          <TransactionModal
            steps={steps}
            setSteps={setSteps}
            quote={quoteInProgress}
            setQuote={setQuoteInProgress}
            swapError={swapError}
            setSwapError={setSwapError}
            open={transactionModalOpen}
            onOpenChange={(open) => {
              setTransactionModalOpen(open)
              onTransactionModalOpenChange(open)
            }}
            fromChain={fromChain}
            toChain={toChain}
            fromToken={fromToken}
            toToken={toToken}
            slippageTolerance={slippageTolerance}
            address={address}
            onAnalyticEvent={onAnalyticEvent}
            onSuccess={onSwapSuccess}
            onSwapValidating={onSwapValidating}
            wallet={wallet}
            linkedWallets={linkedWallets}
            multiWalletSupportEnabled={multiWalletSupportEnabled}
            invalidateQuoteQuery={invalidateQuoteQuery}
          />
          <DepositAddressModal
            open={depositAddressModalOpen}
            onOpenChange={(open) => {
              setDepositAddressModalOpen(open)
              onDepositAddressModalOpenChange(open)
            }}
            fromChain={fromChain}
            fromToken={fromToken}
            toToken={toToken}
            debouncedInputAmountValue={debouncedInputAmountValue}
            debouncedOutputAmountValue={debouncedOutputAmountValue}
            address={address}
            recipient={recipient}
            onAnalyticEvent={onAnalyticEvent}
            onSuccess={onSwapSuccess}
            invalidateBalanceQueries={invalidateBalanceQueries}
          />
        </>
      ) : null}

      <CustomAddressModal
        open={addressModalOpen}
        toAddress={customToAddress}
        toChain={toChain}
        isConnected={wallet !== undefined || isConnected ? true : false}
        linkedWallets={linkedWallets ?? []}
        multiWalletSupportEnabled={multiWalletSupportEnabled}
        wallet={wallet}
        onAnalyticEvent={onAnalyticEvent}
        onOpenChange={(open) => {
          setAddressModalOpen(open)
        }}
        onConfirmed={(address) => {
          setCustomToAddress(address)
        }}
        onClear={() => {
          setCustomToAddress(undefined)
        }}
      />
    </div>
  )
}

export default WidgetContainer
