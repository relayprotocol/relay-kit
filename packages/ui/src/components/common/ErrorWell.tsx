import * as React from 'react'
import { Text } from '../primitives/index.js'
import type { AxiosError } from 'axios'
import type { RelayChain } from '@relayprotocol/relay-sdk'

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

  // subtle scroll style
  const scrollStyles = shouldScrollErrorMessage
    ? {
        maxHeight: 'min(36vh, 220px)',
        overflowY: 'auto',
        px: '1',
        scrollbarWidth: 'thin' as const,
        scrollbarColor: 'var(--relay-colors-gray5) transparent',
        '&::-webkit-scrollbar': {
          width: '6px',
          background: 'transparent'
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'var(--relay-colors-gray5)',
          borderRadius: '999px'
        }
      }
    : {}

  return (
    <Text
      style="subtitle1"
      css={{
        my: '4',
        textAlign: 'center',
        width: '100%',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        ...scrollStyles
      }}
    >
      {renderedErrorMessage}
    </Text>
  )
}

export default ErrorWell
