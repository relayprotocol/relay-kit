import { lazy, memo, Suspense, useEffect, type FC } from 'react'
import {
  ChainTokenIcon,
  Flex,
  Text
} from '../../../../primitives/index.js'
import type { FiatCurrency, Token } from '../../../../../types/index.js'
import { OnrampProcessingStep, OnrampStep } from '../OnrampModal.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import { EventNames } from '../../../../../constants/events.js'
import { arbitrum } from 'viem/chains'
import { useMoonPayTransaction } from '../../../../../hooks/index.js'
import type {
  MoonPayBuyTransactionErrorResponse,
  MoonPayBuyTransactionsResponse
} from '../../../../../hooks/useMoonPayTransaction.js'

type OnrampMoonPayStepProps = {
  step: OnrampStep
  processingStep?: OnrampProcessingStep
  toToken: Token
  fromToken: Token
  fromChain?: RelayChain
  toChain?: RelayChain
  depositAddress?: string
  recipient?: string
  totalAmount?: string
  fiatCurrency: FiatCurrency
  isPassthrough?: boolean
  moonPayCurrencyCode?: string
  moonPayThemeId?: string
  moonPayThemeMode?: 'dark' | 'light'
  moonPayApiKey?: string
  quoteRequestId?: string | null
  passthroughExternalId?: string
  onAnalyticEvent?: (eventName: string, data?: any) => void
  setStep: (step: OnrampStep) => void
  setProcessingStep: (processingStep?: OnrampProcessingStep) => void
  setMoonPayRequestId: (id: string) => void
  moonpayOnUrlSignatureRequested: (url: string) => Promise<string> | void
  onPassthroughSuccess: () => void
  onError: (error: Error) => void
}

const MoonPayBuyWidget = memo(
  lazy(() =>
    import('@moonpay/moonpay-react').then((module) => ({
      default: module.MoonPayBuyWidget
    }))
  ),
  (a, b) => {
    return (
      (window as any).relayOnrampStep === OnrampStep.Moonpay ||
      (window as any).relayOnrampProcessingStep ===
        OnrampProcessingStep.Finalizing
    )
  }
)

arbitrum

export const OnrampMoonPayStep: FC<OnrampMoonPayStepProps> = ({
  step,
  processingStep,
  toToken,
  fromToken,
  fromChain,
  toChain,
  depositAddress,
  recipient,
  totalAmount,
  fiatCurrency,
  isPassthrough,
  moonPayCurrencyCode,
  moonPayThemeId,
  moonPayThemeMode,
  quoteRequestId,
  moonPayApiKey,
  passthroughExternalId,
  onAnalyticEvent,
  setStep,
  setProcessingStep,
  setMoonPayRequestId,
  moonpayOnUrlSignatureRequested,
  onPassthroughSuccess,
  onError
}) => {
  const moonPayExternalId = !isPassthrough
    ? (quoteRequestId ?? undefined)
    : passthroughExternalId
  useEffect(() => {
    if (window) {
      ;(window as any).relayOnrampStep = step
    }
    return () => {
      ;(window as any).relayOnrampStep = undefined
    }
  }, [step])

  useEffect(() => {
    if (window) {
      ;(window as any).relayOnrampProcessingStep = processingStep
    }
    return () => {
      ;(window as any).processingStep = undefined
    }
  }, [processingStep])

  useEffect(() => {
    if (window) {
      ;(window as any).relayIsPassthrough = isPassthrough
    }
    return () => {
      ;(window as any).relayIsPassthrough = undefined
    }
  }, [isPassthrough])

  useMoonPayTransaction(
    moonPayExternalId,
    {
      apiKey: moonPayApiKey
    },
    {
      enabled:
        step !== OnrampStep.Confirming &&
        step !== OnrampStep.Error &&
        step !== OnrampStep.Success,
      refetchInterval: (query) => {
        let data = query.state.data
        if (data && 'moonPayErrorCode' in data) {
          const errorData = data as MoonPayBuyTransactionErrorResponse
          if (errorData.moonPayErrorCode != '1_SYS_UNKNOWN') {
            onAnalyticEvent?.(EventNames.ONRAMPING_MOONPAY_TX_API_ERROR, {
              data,
              isPassthrough
            })
          }
        } else if (data && 'status' in data) {
          const responseData = data as MoonPayBuyTransactionsResponse
          if (responseData?.status === 'failed') {
            onAnalyticEvent?.(EventNames.ONRAMPING_MOONPAY_TX_FAILED, {
              data,
              isPassthrough
            })
            onError(
              new Error(`MoonPayTxFailed: ${data.failureReason ?? 'unknown'}`)
            )
            return 0
          }

          if (responseData?.status === 'completed') {
            onAnalyticEvent?.(EventNames.ONRAMPING_MOONPAY_TX_COMPLETE, {
              data,
              isPassthrough
            })
            if (step === OnrampStep.Processing && !isPassthrough) {
              setProcessingStep(OnrampProcessingStep.Relaying)
            } else if (isPassthrough && step !== OnrampStep.Success) {
              setProcessingStep(undefined)
              onPassthroughSuccess()
            }
            return 0
          }

          if (responseData?.id && responseData?.status === 'pending') {
            if (step === OnrampStep.Moonpay) {
              if (!isPassthrough) {
                setStep(OnrampStep.Processing)
                setProcessingStep(OnrampProcessingStep.Finalizing)
                return 0
              } else {
                setStep(OnrampStep.ProcessingPassthrough)
              }
            }
          }
        }

        return 2000
      }
    }
  )

  return (
    <Flex
      direction="column"
      id="onramp-moonpay-step"
      className="relay-w-full relay-h-full"
      style={{
        position: step === OnrampStep.Moonpay ? undefined : 'fixed',
        top: step === OnrampStep.Moonpay ? undefined : '-100%'
      }}
    >
      <Text style="h6" className="relay-mb-2">
        {!isPassthrough
          ? `Buy ${toToken?.symbol} (${toChain?.displayName})`
          : 'Checkout'}
      </Text>
      {!isPassthrough ? (
        <Flex
          align="center"
          className="relay-w-full relay-overflow-hidden relay-p-4 relay-gap-2 relay-mb-2 relay-rounded-widget-card relay-border relay-border-solid relay-border-[var(--relay-colors-subtle-border-color)]"
        >
          <div
            className="relay-relative relay-shrink-0 relay-w-[48px] relay-h-[52px]"
          >
            <div className="relay-absolute relay-top-0 relay-right-0 relay-z-[1]">
              <ChainTokenIcon
                chainId={toToken?.chainId}
                tokenlogoURI={toToken?.logoURI}
                tokenSymbol={toToken?.symbol}
              />
            </div>
            <div className="relay-absolute relay-bottom-0 relay-left-0">
              <ChainTokenIcon
                chainId={fromToken?.chainId}
                tokenlogoURI={fromToken?.logoURI}
                tokenSymbol={fromToken?.symbol}
              />
            </div>
          </div>
          <Text style="subtitle2">
            Purchase {fromToken?.symbol} ({fromChain?.displayName}) via your
            card for Relay to convert to {toToken?.symbol} (
            {toChain?.displayName})
          </Text>
        </Flex>
      ) : null}
      <Suspense fallback={<div></div>}>
        <MoonPayBuyWidget
          variant="embedded"
          baseCurrencyCode={fiatCurrency.code}
          quoteCurrencyAmount={`${totalAmount}`}
          lockAmount="true"
          currencyCode={moonPayCurrencyCode}
          paymentMethod="credit_debit_card"
          walletAddress={!isPassthrough ? depositAddress : recipient}
          themeId={moonPayThemeId}
          theme={moonPayThemeMode}
          externalTransactionId={moonPayExternalId}
          showWalletAddressForm="false"
          visible
          style={{
            margin: 0,
            width: '100%',
            border: 'none',
            height: 500,
            overflowY: 'scroll'
          }}
          onUrlSignatureRequested={moonpayOnUrlSignatureRequested}
          onTransactionCreated={async (props) => {
            setMoonPayRequestId(props.id)
            onAnalyticEvent?.(EventNames.ONRAMPING_MOONPAY_TX_START, {
              ...props,
              isPassthrough: (window as any).relayIsPassthrough
            })
            if (
              window &&
              (window as any).relayOnrampStep === OnrampStep.Moonpay
            ) {
              if (!(window as any).relayIsPassthrough) {
                setStep(OnrampStep.Processing)
                setProcessingStep(OnrampProcessingStep.Finalizing)
              } else {
                setStep(OnrampStep.ProcessingPassthrough)
              }
            }
          }}
          onTransactionCompleted={async (props) => {
            onAnalyticEvent?.(EventNames.ONRAMPING_MOONPAY_TX_COMPLETE, {
              ...props,
              isPassthrough: (window as any).relayIsPassthrough
            })
            if (
              window &&
              (window as any).relayOnrampStep === OnrampStep.Processing &&
              !(window as any).relayIsPassthrough
            ) {
              setProcessingStep(OnrampProcessingStep.Relaying)
            } else if (
              window &&
              (window as any).relayIsPassthrough &&
              (window as any).relayOnrampStep !== OnrampStep.Success
            ) {
              setProcessingStep(undefined)
              onPassthroughSuccess()
            }
          }}
        />
      </Suspense>
    </Flex>
  )
}
