import { type Execute, RelayClient } from '@relayprotocol/relay-sdk'
import { type RelayTransaction } from '../types/index.js'
import { formatSeconds } from './time.js'

type RequestRoute = NonNullable<NonNullable<RelayTransaction['data']>['route']>
type RouteAmount = NonNullable<
  NonNullable<NonNullable<RequestRoute['quoted']>['origin']>['inputCurrency']
>

/**
 * Resolves the input/output currency amounts to display for a request from
 * `data.route`, preferring actual over quoted values.
 *
 * - currencyIn: the token deposited on the origin side.
 * - currencyOut: the token received, preferring the destination output and
 *   falling back to the origin output (e.g. same-chain swaps).
 *
 * `route.actual` is populated progressively while a request is in flight, so
 * before the request status is `success` it can hold provisional values (e.g.
 * the intermediate origin swap output). Output-side actual values are only
 * used once the request status is `success`; until then the quoted values are
 * returned so the UI never presents a provisional token/amount as received.
 */
export const getRequestCurrencies = (
  transaction?: RelayTransaction | null
): {
  currencyIn?: RouteAmount | null
  currencyOut?: RouteAmount | null
  currencyGasTopup?: RouteAmount | null
} => {
  const route = transaction?.data?.route
  const actual = route?.actual
  const quoted = route?.quoted

  const currencyIn =
    actual?.origin?.inputCurrency ?? quoted?.origin?.inputCurrency

  // Only trust output-side actual values once the request has succeeded
  const settledActual = transaction?.status === 'success' ? actual : undefined

  const currencyOut =
    settledActual?.destination?.outputCurrency ??
    quoted?.destination?.outputCurrency ??
    settledActual?.origin?.outputCurrency ??
    quoted?.origin?.outputCurrency

  const currencyGasTopup = settledActual?.destination?.currencyGasTopup

  return { currencyIn, currencyOut, currencyGasTopup }
}

export const extractFromChain = (
  transaction?: RelayTransaction | null,
  client?: RelayClient | null
) => {
  const chainId = transaction?.data?.inTxs?.[0]?.chainId
  return client?.chains.find((chain) => chain.id === chainId)
}

export const extractToChain = (
  transaction?: RelayTransaction | null,
  client?: RelayClient | null
) => {
  const chainId = transaction?.data?.outTxs?.[0]?.chainId
  return client?.chains.find((chain) => chain.id === chainId)
}

export const calculateFillTime = (transaction?: RelayTransaction | null) => {
  let fillTime = '-'
  let seconds = 0
  if (transaction?.status !== 'pending' && transaction?.status !== 'waiting') {
    const inTxTimestamps =
      transaction?.data?.inTxs?.map((tx) => tx.timestamp as number) ?? null
    const txStartTimestamp = inTxTimestamps ? Math.min(...inTxTimestamps) : null
    const outTxTimestamps =
      transaction?.data?.outTxs
        ?.filter((tx) => tx.timestamp)
        ?.map((tx) => tx.timestamp as number) ?? null

    const txEndTimestamp =
      outTxTimestamps && outTxTimestamps.length > 0
        ? Math.max(...outTxTimestamps)
        : null

    if (txStartTimestamp && txEndTimestamp) {
      seconds = txEndTimestamp - txStartTimestamp
      // Guard against negative time (invalid timestamps or timing issues)
      if (seconds < 0) {
        fillTime = '-'
        seconds = 0
      } else if (seconds > 60) {
        fillTime = formatSeconds(seconds)
      } else {
        fillTime = `${seconds}s`
      }
    }
  }
  return { fillTime, seconds }
}

export const extractDepositRequestId = (steps?: Execute['steps'] | null) => {
  if (!steps?.length) return null

  // Find the first step that has a requestId
  return steps.find((step) => step.requestId)?.requestId || null
}

export const statusToText = {
  pending: 'Pending',
  failure: 'Failure',
  received: 'Received',
  success: 'Success',
  fallback: 'Refunded'
}
