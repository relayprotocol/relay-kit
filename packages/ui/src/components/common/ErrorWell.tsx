import * as React from 'react'
import { Text } from '../primitives/index.js'
import type { AxiosError } from 'axios'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import { cn } from '../../utils/cn.js'

interface Props {
  error?: Error | null | AxiosError
  hasTxHashes?: boolean
  fromChain?: RelayChain | null
}

const ErrorWell: React.FC<Props> = ({ error, hasTxHashes, fromChain }) => {
  const renderedErrorMessage = React.useMemo((): React.ReactNode => {
    if (error && ((error as AxiosError).response?.data as any)?.message) {
      return (error as any).response?.data?.message
    }
    if (
      error?.message?.includes('An internal error was received.') ||
      !error?.message
    ) {
      return 'Oops! Something went wrong while processing your transaction.'
    } else if (
      error?.name &&
      (error?.message?.includes('does not support chain') ||
        error?.message?.match(/Chain \d+ not supported/))
    ) {
      return `Your wallet does not support ${fromChain?.displayName ?? 'this chain'}`
    }
    if (
      !hasTxHashes ||
      error?.message?.includes('Deposit transaction with hash')
    ) {
      return 'Oops, something went wrong while initiating the swap. Your request was not submitted. Please try again, and make sure your wallet is unlocked.'
    } else if (error?.message?.includes('solver status check')) {
      return 'This transaction is taking longer than usual to process. Please visit the transaction page for more details.'
    } else if (error?.message?.includes('OUT_OF_ENERGY')) {
      return 'Your wallet does not have enough energy to complete the transaction. Please top up your energy.'
    } else if (error.name === 'TransactionConfirmationError') {
      return 'Transaction Failed. Try adjusting slippage or gas limits and try again.'
    }
    return error?.message
  }, [error?.message, hasTxHashes])

  const shouldScrollErrorMessage =
    typeof renderedErrorMessage === 'string' &&
    renderedErrorMessage.length > 280

  return (
    <Text
      style="subtitle1"
      className={cn(
        'relay-my-4 relay-text-center relay-w-full relay-break-words',
        '[overflow-wrap:anywhere]',
        shouldScrollErrorMessage && [
          'relay-max-h-[min(36vh,220px)] relay-overflow-y-auto relay-px-1',
          '[scrollbar-width:thin]',
          '[scrollbar-color:var(--relay-colors-gray5)_transparent]',
          '[&::-webkit-scrollbar]:relay-w-[6px] [&::-webkit-scrollbar]:relay-bg-transparent',
          '[&::-webkit-scrollbar-track]:relay-bg-transparent',
          '[&::-webkit-scrollbar-thumb]:relay-bg-[var(--relay-colors-gray5)] [&::-webkit-scrollbar-thumb]:relay-rounded-full'
        ]
      )}
    >
      {renderedErrorMessage}
    </Text>
  )
}

export default ErrorWell
