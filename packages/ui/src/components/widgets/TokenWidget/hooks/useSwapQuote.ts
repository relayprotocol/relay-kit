import { useCallback } from 'react'
import { useQuote } from '@relayprotocol/relay-kit-hooks'
import type { QueryClient } from '@tanstack/react-query'

type QuoteClient = Parameters<typeof useQuote>[0]
type QuoteWallet = Parameters<typeof useQuote>[1]
type QuoteParameters = Parameters<typeof useQuote>[2]
type QuoteRequested = Parameters<typeof useQuote>[3]
type QuoteReceived = Parameters<typeof useQuote>[4]
type QuoteQueryOptions = Parameters<typeof useQuote>[5]
type QuoteErrorHandler = Parameters<typeof useQuote>[6]

type UseSwapQuoteParams = {
  client?: QuoteClient
  wallet?: QuoteWallet
  parameters?: QuoteParameters
  onRequested?: QuoteRequested
  onReceived?: QuoteReceived
  enabled: boolean
  refetchInterval?: number
  onError?: QuoteErrorHandler
  secureBaseUrl?: string
  queryClient: QueryClient
}

export const useSwapQuote = ({
  client,
  wallet,
  parameters,
  onRequested,
  onReceived,
  enabled,
  refetchInterval,
  onError,
  secureBaseUrl,
  queryClient
}: UseSwapQuoteParams) => {
  const queryOptions: Partial<QuoteQueryOptions> = {
    refetchOnWindowFocus: false,
    enabled,
    refetchInterval
  }

  const {
    data,
    error,
    isFetching,
    executeQuote,
    queryKey
  } = useQuote(
    client,
    wallet,
    parameters,
    onRequested,
    onReceived,
    queryOptions,
    onError,
    undefined,
    secureBaseUrl
  )

  const invalidateQuoteQuery = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const derivedError = data || (isFetching && enabled) ? null : error
  const quote = derivedError ? undefined : data

  return {
    quote,
    error: derivedError,
    rawError: error,
    isFetchingQuote: isFetching,
    executeSwap: executeQuote,
    quoteQueryKey: queryKey,
    invalidateQuoteQuery
  }
}

export type { UseSwapQuoteParams }
