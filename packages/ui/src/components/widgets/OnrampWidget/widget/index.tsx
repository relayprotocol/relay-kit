import type { Dispatch, FC } from 'react'
import OnrampWidgetRenderer from './OnrampWidgetRenderer.js'
import { Box, Button, Flex, Text } from '../../../primitives/index.js'
import AmountInput from '../../../common/AmountInput.js'
import { useCallback, useContext, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowDownLong,
  faArrowUpLong,
  faClipboard,
  faCreditCard
} from '@fortawesome/free-solid-svg-icons'
import TokenSelector from '../../../common/TokenSelector/TokenSelector.js'
import { EventNames } from '../../../../constants/events.js'
import { TokenTrigger } from '../../../common/TokenSelector/triggers/TokenTrigger.js'
import type { LinkedWallet, Token } from '../../../../types/index.js'
import type { ChainVM, Execute, RelayChain } from '@relayprotocol/relay-sdk'
import { MultiWalletDropdown } from '../../../common/MultiWalletDropdown.js'
import { CustomAddressModal } from '../../../common/CustomAddressModal.js'
import { useAccount } from 'wagmi'
import { OnrampModal } from '../modals/OnrampModal.js'
import { formatBN } from '../../../../utils/numbers.js'
import { findSupportedWallet } from '../../../../utils/address.js'
import { ProviderOptionsContext } from '../../../../providers/RelayKitProvider.js'

type BaseOnrampWidgetProps = {
  defaultWalletAddress?: string
  supportedWalletVMs: Omit<ChainVM, 'hypevm'>[]
  moonPayApiKey: string
  moonPayThemeId?: string
  moonPayThemeMode?: 'dark' | 'light'
  token?: Token
  setToken?: (token: Token) => void
  disablePasteWalletAddressOption?: boolean
  onTokenChange?: (token?: Token) => void
  onSuccess?: (data: Execute, moonpayRequestId: string) => void
  onError?: (error: string, data?: Execute, moonpayRequestId?: string) => void
  moonpayOnUrlSignatureRequested: (url: string) => Promise<string> | void
  onConnectWallet?: () => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
}

type MultiWalletDisabledProps = BaseOnrampWidgetProps & {
  multiWalletSupportEnabled?: false
  linkedWallets?: never
  onSetPrimaryWallet?: never
  onLinkNewWallet?: never
}

type MultiWalletEnabledProps = BaseOnrampWidgetProps & {
  multiWalletSupportEnabled: true
  linkedWallets: LinkedWallet[]
  onSetPrimaryWallet?: (address: string) => void
  onLinkNewWallet: (params: {
    chain?: RelayChain
    direction: 'to' | 'from'
  }) => Promise<LinkedWallet> | void
}

export type OnrampWidgetProps =
  | MultiWalletDisabledProps
  | MultiWalletEnabledProps

const OnrampWidget: FC<OnrampWidgetProps> = ({
  defaultWalletAddress,
  moonPayApiKey,
  moonpayOnUrlSignatureRequested,
  linkedWallets,
  multiWalletSupportEnabled,
  supportedWalletVMs,
  moonPayThemeId,
  moonPayThemeMode,
  token,
  setToken,
  disablePasteWalletAddressOption,
  onTokenChange,
  onConnectWallet,
  onLinkNewWallet,
  onSetPrimaryWallet,
  onAnalyticEvent: _onAnalyticEvent,
  onSuccess
}): JSX.Element => {
  const onAnalyticEvent = useCallback(
    (eventName: string, data?: any) => {
      try {
        _onAnalyticEvent?.(eventName, data)
      } catch (e) {
        console.error('Error in onAnalyticEvent', eventName, data, e)
      }
    },
    [_onAnalyticEvent]
  )
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [onrampModalOpen, setOnrampModalOpen] = useState(false)
  const { isConnected } = useAccount()
  const providerOptionsContext = useContext(ProviderOptionsContext)
  const connectorKeyOverrides = providerOptionsContext.vmConnectorKeyOverrides

  return (
    <OnrampWidgetRenderer
      defaultWalletAddress={defaultWalletAddress}
      supportedWalletVMs={supportedWalletVMs}
      linkedWallets={linkedWallets}
      multiWalletSupportEnabled={multiWalletSupportEnabled}
      moonPayApiKey={moonPayApiKey}
      token={token}
      setToken={setToken}
    >
      {({
        displayCurrency,
        setDisplayCurrency,
        recipient,
        setRecipient,
        isRecipientLinked,
        isValidRecipient,
        amount,
        amountToToken,
        setInputValue,
        amountToTokenFormatted,
        token,
        fromToken,
        setToken,
        toChain,
        fromChain,
        toDisplayName,
        toChainWalletVMSupported,
        fiatCurrency,
        setFiatCurrency,
        minAmountCurrency,
        notEnoughFiat,
        ctaCopy,
        moonPayCurrencyCode,
        isPassthrough,
        usdRate
      }) => {
        //Reset recipient if no longer valid
        useEffect(() => {
          if (
            multiWalletSupportEnabled &&
            fromChain &&
            recipient &&
            linkedWallets &&
            !isValidRecipient
          ) {
            const supportedAddress = findSupportedWallet(
              fromChain,
              recipient,
              linkedWallets,
              connectorKeyOverrides
            )
            if (supportedAddress) {
              onSetPrimaryWallet?.(supportedAddress)
            }
          }

          if (
            multiWalletSupportEnabled &&
            toChain &&
            recipient &&
            linkedWallets &&
            !isValidRecipient
          ) {
            setRecipient(undefined)
          }
        }, [
          multiWalletSupportEnabled,
          fromChain?.id,
          toChain?.id,
          linkedWallets,
          onSetPrimaryWallet,
          isValidRecipient,
          connectorKeyOverrides
        ])

        const formattedAmount =
          amount === ''
            ? ''
            : amount.endsWith('.')
              ? new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: 'USD',
                  currencyDisplay: 'narrowSymbol',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(+amount) + '.'
              : new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: 'USD',
                  currencyDisplay: 'narrowSymbol',
                  minimumFractionDigits: amount.includes('.0')
                    ? 1
                    : amount.endsWith('0') && amount.includes('.')
                      ? 2
                      : 0,
                  maximumFractionDigits: amount.includes('.') ? 2 : 0,
                  minimumSignificantDigits: 1,
                  maximumSignificantDigits: amount.length
                }).format(+amount)

        return (
          <div
            className="relay-kit-reset"
            style={{ maxWidth: 408, minWidth: 308, width: '100%' }}
          >
            <Flex
              direction="column"
              css={{
                gap: '2',
                border: 'widget-border',
                width: '100%'
              }}
            >
              <Flex
                direction="column"
                css={{
                  width: '100%',
                  overflow: 'hidden',
                  borderRadius: 'widget-card-border-radius',
                  backgroundColor: 'widget-background',
                  border: 'widget-card-border',
                  mb: 'widget-card-section-gutter',
                  px: '4',
                  pt: '40px',
                  pb: '24px'
                }}
              >
                <Text
                  style="subtitle2"
                  color="subtle"
                  css={{ textAlign: 'center' }}
                >
                  Enter an amount
                </Text>
                <AmountInput
                  value={
                    displayCurrency
                      ? amountToToken !== ''
                        ? `${amountToToken} ${token.symbol}`
                        : ''
                      : formattedAmount
                  }
                  setValue={(e) => {
                    //unused
                  }}
                  placeholder={`   0`}
                  onChange={(e) => {
                    const input = e.target as any

                    setInputValue(input.value)
                    if (displayCurrency) {
                      setTimeout(() => {
                        const numericValue = input.value.match(/[\d.]+/g)
                        const numericValueLength =
                          numericValue !== null
                            ? numericValue.join('').length
                            : 0
                        input.setSelectionRange(
                          numericValueLength,
                          numericValueLength
                        )
                      }, 0)
                    }
                  }}
                  onKeyDown={(e) => {
                    const input = e.target as HTMLInputElement
                    const cursorPosition = input.selectionStart

                    // Prevent multiple decimals
                    if (
                      e.key === '.' &&
                      (input.value.match(/\./g) || []).length > 0
                    ) {
                      e.preventDefault() // Prevent the key press if there's already a decimal
                      return
                    }

                    if (e.key === 'ArrowLeft' && cursorPosition !== null) {
                      const valueBeforeCursor = input.value.substring(
                        0,
                        cursorPosition
                      )
                      const charBeforeCursor = valueBeforeCursor.charAt(
                        cursorPosition - 1
                      )
                      if (charBeforeCursor === '$') {
                        e.preventDefault()
                      }
                    }
                    if (e.key === 'ArrowRight' && cursorPosition !== null) {
                      const valueAfterCursor = input.value.substring(
                        0,
                        cursorPosition + 1
                      )
                      const charAfterCursor =
                        valueAfterCursor.charAt(cursorPosition)
                      if (charAfterCursor === ' ') {
                        e.preventDefault()
                      }
                    }
                  }}
                  onMouseDown={(e) => {
                    const input = e.target as HTMLInputElement
                    input.style.caretColor = 'transparent'
                  }}
                  onMouseUp={(e) => {
                    const input = e.target as HTMLInputElement
                    const cursorPosition = input.selectionStart // Get the current cursor position
                    if (cursorPosition !== null) {
                      const valueAfterCursor = input.value.substring(
                        0,
                        cursorPosition + 1
                      )
                      const charAfterCursor =
                        valueAfterCursor.charAt(cursorPosition)
                      const valueBeforeCursor = input.value.substring(
                        0,
                        cursorPosition
                      )
                      const charBeforeCursor = valueBeforeCursor.charAt(
                        cursorPosition - 1
                      )
                      const specialCharacterRegex = /[ a-zA-Z]/
                      const alphaRegex = /[a-zA-Z]/
                      if (
                        charAfterCursor === '$' ||
                        alphaRegex.test(charAfterCursor) ||
                        specialCharacterRegex.test(charBeforeCursor)
                      ) {
                        e.preventDefault()
                        e.stopPropagation()
                        input.setSelectionRange(1, 1)
                      }
                    }
                    input.style.caretColor = 'initial'
                  }}
                  css={{
                    fontWeight: '700',
                    fontSize: 48,
                    lineHeight: '58px',
                    textAlign: 'center',
                    textIndent:
                      amount === '' || amountToToken === ''
                        ? '-36px'
                        : undefined,
                    whiteSpace: 'pre',
                    _placeholder: {
                      color: 'text-subtle'
                    }
                  }}
                  containerCss={{
                    mb: '2',
                    width: '100%'
                  }}
                />
                {notEnoughFiat ? (
                  <Text color="red" css={{ mb: 24, textAlign: 'center' }}>
                    Minimum amount is{' '}
                    {displayCurrency && minAmountCurrency
                      ? `${minAmountCurrency} ${token.symbol}`
                      : '$20'}
                  </Text>
                ) : undefined}
                <button
                  style={{
                    gap: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    alignSelf: 'center'
                  }}
                  onClick={() => {
                    const _displayCurrency = !displayCurrency
                    setDisplayCurrency(_displayCurrency)
                    if (_displayCurrency) {
                      let _amountToToken = 21 / usdRate
                      if (+amountToToken > _amountToToken) {
                        _amountToToken = +amountToToken
                      }
                      setInputValue(
                        formatBN(_amountToToken, 5, token.decimals, false),
                        _displayCurrency
                      )
                    }
                  }}
                >
                  <Text style="body2" color="subtle">
                    {displayCurrency
                      ? formattedAmount
                      : `${amountToTokenFormatted} ${token.symbol}`}
                  </Text>
                  <Flex
                    css={{
                      color: 'gray8'
                    }}
                  >
                    <FontAwesomeIcon
                      style={{ height: 14 }}
                      icon={faArrowUpLong}
                    />
                    <FontAwesomeIcon
                      style={{ height: 14 }}
                      icon={faArrowDownLong}
                    />
                  </Flex>
                </button>
                <TokenSelector
                  address={recipient}
                  isValidAddress={isValidRecipient}
                  token={token}
                  onAnalyticEvent={onAnalyticEvent}
                  fromChainWalletVMSupported={false}
                  supportedWalletVMs={[]}
                  setToken={(token) => {
                    setToken(token)
                    onTokenChange?.(token)
                  }}
                  context="to"
                  trigger={
                    <div
                      style={{
                        width: 'max-content',
                        margin: '0 auto',
                        marginBottom: '16px'
                      }}
                      data-testid="onramp-token-select-button"
                    >
                      <TokenTrigger token={token} />
                    </div>
                  }
                />
                <Flex css={{ gap: '2', margin: '0 auto' }}>
                  <Button
                    color="white"
                    corners="pill"
                    css={{
                      minHeight: 28,
                      px: 3,
                      py: 1,
                      _light: {
                        filter:
                          amount === '100' && !displayCurrency
                            ? 'brightness(97%)'
                            : undefined
                      },
                      _dark: {
                        filter:
                          amount === '100' && !displayCurrency
                            ? 'brightness(130%)'
                            : undefined
                      }
                    }}
                    onClick={() => {
                      setDisplayCurrency(false)
                      setInputValue('100', false)
                    }}
                  >
                    <Text style="subtitle2">$100</Text>
                  </Button>
                  <Button
                    color="white"
                    corners="pill"
                    css={{
                      minHeight: 28,
                      px: 3,
                      py: 1,
                      _light: {
                        filter:
                          amount === '300' && !displayCurrency
                            ? 'brightness(97%)'
                            : undefined
                      },
                      _dark: {
                        filter:
                          amount === '300' && !displayCurrency
                            ? 'brightness(130%)'
                            : undefined
                      }
                    }}
                    onClick={() => {
                      setDisplayCurrency(false)
                      setInputValue('300', false)
                    }}
                  >
                    <Text style="subtitle2">$300</Text>
                  </Button>
                  <Button
                    color="white"
                    corners="pill"
                    css={{
                      minHeight: 28,
                      px: 3,
                      py: 1,
                      _light: {
                        filter:
                          amount === '1000' && !displayCurrency
                            ? 'brightness(97%)'
                            : undefined
                      },
                      _dark: {
                        filter:
                          amount === '1000' && !displayCurrency
                            ? 'brightness(130%)'
                            : undefined
                      }
                    }}
                    onClick={() => {
                      setDisplayCurrency(false)
                      setInputValue('1000', false)
                    }}
                  >
                    <Text style="subtitle2">$1,000</Text>
                  </Button>
                </Flex>
              </Flex>
            </Flex>
            <Flex
              direction="column"
              css={{
                width: '100%',
                overflow: 'hidden',
                borderRadius: 'widget-card-border-radius',
                backgroundColor: 'widget-background',
                border: 'widget-card-border',
                mb: 'widget-card-section-gutter',
                p: '4'
              }}
            >
              <Flex justify="between" align="center" css={{ mb: '2' }}>
                <Text color="subtle" style="subtitle2">
                  Recipient
                </Text>
                {multiWalletSupportEnabled === true &&
                toChainWalletVMSupported ? (
                  <MultiWalletDropdown
                    context="destination"
                    selectedWalletAddress={recipient}
                    onSelect={(wallet) => setRecipient(wallet.address)}
                    chain={toChain}
                    onLinkNewWallet={() => {
                      if (
                        (!linkedWallets || linkedWallets.length === 0) &&
                        toChainWalletVMSupported
                      ) {
                        onConnectWallet?.()
                      } else {
                        onLinkNewWallet?.({
                          chain: toChain,
                          direction: 'to'
                        })?.then((wallet) => {
                          onSetPrimaryWallet?.(wallet.address)
                        })
                      }
                    }}
                    setAddressModalOpen={setAddressModalOpen}
                    wallets={linkedWallets!}
                    onAnalyticEvent={onAnalyticEvent}
                    disablePasteWalletAddressOption={
                      disablePasteWalletAddressOption
                    }
                    testId="onramp-wallet-select-button"
                  />
                ) : null}
                {!multiWalletSupportEnabled || !toChainWalletVMSupported ? (
                  <Button
                    color={
                      isValidRecipient && !isRecipientLinked
                        ? 'warning'
                        : 'secondary'
                    }
                    corners="pill"
                    size="none"
                    css={{
                      display: 'flex',
                      alignItems: 'center',
                      px: '2',
                      py: '1'
                    }}
                    onClick={() => {
                      setAddressModalOpen(true)
                      onAnalyticEvent?.(EventNames.SWAP_ADDRESS_MODAL_CLICKED)
                    }}
                  >
                    {isValidRecipient && !isRecipientLinked ? (
                      <Box css={{ color: 'amber11' }}>
                        <FontAwesomeIcon
                          icon={faClipboard}
                          width={16}
                          height={16}
                        />
                      </Box>
                    ) : null}
                    <Text
                      style="subtitle2"
                      css={{
                        color:
                          isValidRecipient && !isRecipientLinked
                            ? 'amber11'
                            : 'anchor-color'
                      }}
                    >
                      {!isValidRecipient ? `Enter Address` : toDisplayName}
                    </Text>
                  </Button>
                ) : null}
              </Flex>
              <Flex justify="between" align="center">
                <Text color="subtle" style="subtitle2">
                  Paying with
                </Text>
                <Flex
                  css={{
                    alignItems: 'center',
                    gap: '2',
                    ml: 'auto',
                    mr: '2',
                    color: 'gray9'
                  }}
                >
                  <FontAwesomeIcon style={{ width: 16 }} icon={faCreditCard} />
                  <Text style="subtitle2">Card</Text>
                </Flex>
                {/* Hiding this until issues are resolved with MoonPay
                <FiatCurrencyModal
                  fiatCurrency={fiatCurrency}
                  setFiatCurrency={setFiatCurrency}
                  moonPayApiKey={moonPayApiKey}
                /> */}
              </Flex>
            </Flex>
            <Button
              cta={true}
              css={{ width: '100%', justifyContent: 'center' }}
              disabled={notEnoughFiat}
              onClick={() => {
                if (!recipient && toChainWalletVMSupported) {
                  if (!linkedWallets || linkedWallets.length === 0) {
                    onConnectWallet?.()
                  } else {
                    onLinkNewWallet?.({
                      chain: toChain,
                      direction: 'to'
                    })?.then((wallet) => {
                      onSetPrimaryWallet?.(wallet.address)
                    })
                  }
                } else if (!recipient) {
                  setAddressModalOpen(true)
                } else {
                  setOnrampModalOpen(true)
                }
              }}
            >
              {ctaCopy}
            </Button>
            <CustomAddressModal
              open={addressModalOpen}
              toAddress={recipient}
              toChain={toChain}
              isConnected={
                (linkedWallets && linkedWallets.length > 0) || isConnected
                  ? true
                  : false
              }
              linkedWallets={linkedWallets ?? []}
              multiWalletSupportEnabled={multiWalletSupportEnabled}
              onAnalyticEvent={onAnalyticEvent}
              onOpenChange={(open) => {
                setAddressModalOpen(open)
              }}
              onConfirmed={(address) => {
                setRecipient(address)
              }}
              onClear={() => {
                setRecipient(undefined)
              }}
            />
            <OnrampModal
              open={onrampModalOpen}
              onOpenChange={setOnrampModalOpen}
              onAnalyticEvent={onAnalyticEvent}
              moonpayOnUrlSignatureRequested={moonpayOnUrlSignatureRequested}
              fromToken={fromToken}
              toToken={token}
              fromChain={fromChain}
              toChain={toChain}
              amount={amount}
              amountFormatted={formattedAmount}
              amountToTokenFormatted={amountToTokenFormatted}
              fiatCurrency={fiatCurrency}
              recipient={recipient}
              onSuccess={onSuccess}
              moonPayCurrencyCode={moonPayCurrencyCode}
              isPassthrough={isPassthrough}
              usdRate={usdRate}
              moonPayThemeId={moonPayThemeId}
              moonPayThemeMode={moonPayThemeMode}
              moonPayApiKey={moonPayApiKey}
            />
          </div>
        )
      }}
    </OnrampWidgetRenderer>
  )
}

export default OnrampWidget
