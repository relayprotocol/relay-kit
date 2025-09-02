import type { Execute, paths, RelayChain } from '@relayprotocol/relay-sdk'
import { formatBN, formatDollar } from './numbers.js'
import type { BridgeFee } from '../types/index.js'
import { formatSeconds, get15MinuteInterval } from './time.js'
import type { QuoteResponse, useQuote } from '@relayprotocol/relay-kit-hooks'
import type { ComponentPropsWithoutRef } from 'react'
import type Text from '../components/primitives/Text.js'
import { bitcoin } from '../utils/bitcoin.js'
import axios from 'axios'
import { sha256 } from './hashing.js'
import type { FeeBreakdown } from '../types/FeeBreakdown.js'

const formatUsdFee = (
  amountUsd: string | undefined,
  shouldFlipSign: boolean = false
) => {
  const value = Number(amountUsd ?? 0)
  const finalValue = shouldFlipSign ? -value : value
  return {
    value: finalValue,
    formatted: formatDollar(finalValue)
  }
}

export const parseFees = (
  selectedTo: RelayChain,
  selectedFrom: RelayChain,
  quote?: ReturnType<typeof useQuote>['data']
): FeeBreakdown => {
  const fees = quote?.fees
  const gasFee = BigInt(fees?.gas?.amount ?? 0)
  const formattedGasFee = formatBN(
    gasFee,
    5,
    Number(fees?.gas?.currency?.decimals ?? 18)
  )
  const relayerGasFee = BigInt(fees?.relayerGas?.amount ?? 0)
  const formattedRelayerGas = formatBN(
    relayerGasFee,
    5,
    Number(fees?.relayerGas?.currency?.decimals ?? 18)
  )
  const relayerFee = BigInt(fees?.relayerService?.amount ?? 0)
  const relayerFeeIsReward = relayerFee < 0
  const formattedRelayer = relayerFeeIsReward
    ? formatBN(
        BigInt(fees?.relayerService?.amount?.replace('-', '') ?? 0),
        5,
        Number(fees?.relayerService?.currency?.decimals ?? 18)
      )
    : formatBN(
        relayerFee,
        5,
        Number(fees?.relayerService?.currency?.decimals ?? 18)
      )
  const appFee = BigInt(fees?.app?.amount ?? 0)
  const totalFeesUsd =
    Number(fees?.relayer?.amountUsd ?? 0) + Number(fees?.app?.amountUsd ?? 0)
  const _isGasSponsored = isGasSponsored(quote)

  const breakdown: BridgeFee[] = [
    {
      raw: gasFee,
      formatted: `${formattedGasFee}`,
      usd: formatUsdFee(fees?.gas?.amountUsd, true),
      name: `Deposit Gas (${selectedFrom.displayName})`,
      tooltip: null,
      type: 'gas',
      id: 'origin-gas',
      currency: fees?.gas?.currency
    },
    {
      raw: _isGasSponsored ? 0n : relayerGasFee,
      formatted: _isGasSponsored ? '0' : `${formattedRelayerGas}`,
      usd: _isGasSponsored
        ? { value: 0, formatted: '0' }
        : formatUsdFee(fees?.relayerGas?.amountUsd, true),
      name: `Fill Gas (${selectedTo.displayName})`,
      tooltip: null,
      type: 'gas',
      id: 'destination-gas',
      currency: fees?.relayerGas?.currency
    },
    {
      raw: _isGasSponsored ? 0n : relayerFee,
      formatted: _isGasSponsored
        ? '0'
        : `${relayerFeeIsReward ? '+' : '-'}${formattedRelayer}`,
      usd: _isGasSponsored
        ? { value: 0, formatted: '0' }
        : formatUsdFee(fees?.relayerService?.amountUsd, true),
      name: relayerFeeIsReward ? 'Reward' : 'Relay Fee',
      tooltip: null,
      type: 'relayer',
      id: 'relayer-fee',
      currency: fees?.relayerService?.currency
    }
  ]
  if (appFee) {
    const formattedAppFee = formatBN(
      appFee,
      5,
      Number(fees?.app?.currency?.decimals ?? 18)
    )
    breakdown.push({
      raw: _isGasSponsored ? 0n : appFee,
      formatted: _isGasSponsored ? '0' : `${formattedAppFee}`,
      usd: _isGasSponsored
        ? { value: 0, formatted: '0' }
        : formatUsdFee(fees?.app?.amountUsd, true),
      name: 'App Fee',
      tooltip: null,
      type: 'relayer',
      id: 'app-fee',
      currency: fees?.app?.currency
    })
  }

  let priceImpactColor: ComponentPropsWithoutRef<typeof Text>['color'] =
    'subtleSecondary'

  if (quote?.details?.totalImpact?.percent === '-0.00') {
    quote.details.totalImpact.percent = '-0.01'
  }

  if (quote?.details?.totalImpact?.percent) {
    let percent = Number(quote.details.totalImpact.percent)
    if (percent <= -3) {
      priceImpactColor = 'red'
    } else if (percent > 0) {
      priceImpactColor = 'success'
    } else if (_isGasSponsored) {
      priceImpactColor = 'success'
    }
  }
  return {
    breakdown,
    totalFees: {
      usd: formatDollar(totalFeesUsd),
      priceImpactPercentage: quote?.details?.totalImpact?.percent
        ? `${quote?.details?.totalImpact?.percent}%`
        : undefined,
      priceImpact:
        quote?.details?.totalImpact?.usd &&
        quote?.details?.totalImpact?.usd != '0'
          ? formatDollar(parseFloat(quote?.details?.totalImpact?.usd ?? 0))
          : undefined,
      priceImpactColor,
      swapImpact: formatUsdFee(quote?.details?.swapImpact?.usd, false)
    },
    isGasSponsored: _isGasSponsored
  }
}

export const calculateRelayerFeeProportionUsd = (quote?: QuoteResponse) => {
  const usdIn = quote?.details?.currencyIn?.amountUsd
    ? Number(quote.details.currencyIn.amountUsd)
    : null
  const relayerServiceFeeUsd = quote?.fees?.relayerService?.amountUsd
    ? Number(quote.fees.relayerService.amountUsd)
    : null

  if (!usdIn || !relayerServiceFeeUsd) {
    return 0n
  }

  return BigInt(Math.floor((relayerServiceFeeUsd * 100) / usdIn))
}

export const calculateRelayerFeeProportion = (
  totalAmount: { rawExcludingOriginGas: bigint },
  feeBreakdown: BridgeFee[]
) => {
  if (totalAmount.rawExcludingOriginGas > 0n) {
    const relayerFeeRaw =
      feeBreakdown.find((fee) => fee.id === 'relayer-fee')?.raw ?? 0n
    return (relayerFeeRaw * 100n) / totalAmount.rawExcludingOriginGas
  }
  return 0n
}

export const isHighRelayerServiceFeeUsd = (quote?: QuoteResponse) => {
  const usdIn = quote?.details?.currencyIn?.amountUsd
    ? Number(quote.details.currencyIn.amountUsd)
    : null
  const relayerServiceFeeUsd = quote?.fees?.relayerService?.amountUsd
    ? Number(quote.fees.relayerService.amountUsd)
    : null

  if (!usdIn || !relayerServiceFeeUsd) {
    return false
  }

  const feeThresholdPercentage = (usdIn * 1.5) / 100
  const feeThresholdUsd = 25
  return (
    relayerServiceFeeUsd > feeThresholdPercentage &&
    relayerServiceFeeUsd > feeThresholdUsd
  )
}

export const extractQuoteId = (
  steps?: Execute['steps'] | QuoteResponse['steps']
) => {
  return steps && steps[0] ? steps[0].requestId : undefined
}

export const extractDepositAddress = (steps?: Execute['steps']) => {
  const depositStep = steps?.find((step) => step.id === 'deposit')
  return depositStep?.depositAddress
}

export const calculatePriceTimeEstimate = (
  details?: QuoteResponse['details']
) => {
  const isBitcoin =
    details?.currencyIn?.currency?.chainId === bitcoin.id ||
    details?.currencyOut?.currency?.chainId === bitcoin.id

  //If the relay is interacting with bitcoin we hardcode the time estime to 10m
  const time = isBitcoin ? 1200 : (details?.timeEstimate ?? 0)
  const formattedTime = formatSeconds(time)

  return {
    time,
    formattedTime
  }
}

export const appendMetadataToRequest = (
  baseUrl?: string,
  requestId?: string,
  additionalMetadata?: paths['/requests/metadata']['post']['requestBody']['content']['application/json']['additionalMetadata'],
  referrer?: string
) => {
  if (requestId && additionalMetadata) {
    const triggerData: paths['/requests/metadata']['post']['requestBody']['content']['application/json'] & {
      referrer?: string
    } = {
      requestId,
      additionalMetadata,
      referrer
    }

    return axios.request({
      url: `${baseUrl}/requests/metadata`,
      method: 'POST',
      data: triggerData
    })
  }
}

export const getCurrentStep = (steps?: Execute['steps'] | null) => {
  if (!steps) {
    return { step: null, stepItem: null }
  }

  const executableSteps = steps.filter(
    (step) => step.items && step.items.length > 0
  )

  const step = executableSteps.find((step) =>
    step.items.some((item) => item.status === 'incomplete')
  )
  const stepItem = step?.items.find((item) => item.status === 'incomplete')
  return { step, stepItem }
}

export const getSwapEventData = (
  details: Execute['details'],
  fees: Execute['fees'],
  steps: Execute['steps'] | null,
  connector?: string,
  quoteParameters?: Parameters<typeof useQuote>['2']
) => {
  let operation: string | undefined = details?.operation

  if (operation === 'swap') {
    const isSameChain =
      details?.currencyIn?.currency?.chainId ===
      details?.currencyOut?.currency?.chainId
    if (isSameChain) {
      operation = 'same_chain_swap'
    } else if (
      details?.currencyIn?.currency?.symbol ===
      details?.currencyOut?.currency?.symbol
    ) {
      operation = 'bridge'
    } else {
      operation = 'cross_chain_swap'
    }
  }
  const interval = get15MinuteInterval()
  const quoteRequestId = sha256({ ...quoteParameters, interval })

  return {
    wallet_connector: connector,
    quote_request_id: quoteRequestId,
    quote_id: steps ? extractQuoteId(steps) : undefined,
    amount_in: details?.currencyIn?.amount,
    currency_in: details?.currencyIn?.currency?.symbol,
    currency_in_address: details?.currencyIn?.currency?.address,
    chain_id_in: details?.currencyIn?.currency?.chainId,
    amount_out: details?.currencyOut?.amount,
    currency_out: details?.currencyOut?.currency?.symbol,
    currency_out_address: details?.currencyOut?.currency?.address,
    chain_id_out: details?.currencyOut?.currency?.chainId,
    currency_in_usd: details?.currencyIn?.amountUsd,
    currency_out_usd: details?.currencyOut?.amountUsd,
    deposit_address: steps?.find((step) => step.depositAddress)?.depositAddress,
    txHashes: steps
      ?.map((step) => {
        let txHashes: { chainId: number; txHash: string }[] = []
        step.items?.forEach((item) => {
          if (item.txHashes) {
            txHashes = txHashes.concat([
              ...(item.txHashes ?? []),
              ...(item.internalTxHashes ?? [])
            ])
          }
        })
        return txHashes
      })
      .flat(),
    operation,
    checkStatuses: steps
      ?.map((step) => {
        let checkStatuses: { stepId: string; checkStatus: string }[] = []
        step.items?.forEach((item) => {
          if (item.checkStatus) {
            checkStatuses.push({
              stepId: step.id,
              checkStatus: item.checkStatus
            })
          }
        })
        return checkStatuses
      })
      .flat(),
    subsidized:
      fees?.subsidized !== undefined && fees.subsidized.amount !== '0'
        ? true
        : false
  }
}

export const calculateUsdValue = (
  price?: number,
  amountString?: string
): number | undefined => {
  if (price && price > 0 && amountString && Number(amountString) > 0) {
    try {
      return parseFloat(amountString) * price
    } catch (e) {
      console.error(
        'Failed to parse amount string for USD calculation',
        amountString,
        e
      )
    }
  }
  return undefined
}

export const isGasSponsored = (quote?: QuoteResponse) => {
  return (
    quote?.fees?.subsidized?.amount != undefined &&
    quote?.fees?.subsidized?.amount != '0'
  )
}
