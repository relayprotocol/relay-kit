import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FC,
  type ReactNode,
  type SetStateAction
} from 'react'
import {
  useRelayClient,
  useIsPassthrough,
  useSupportedMoonPayCurrencyCode,
  useFallbackState,
  useDisplayName
} from '../../../../hooks/index.js'
import { zeroAddress } from 'viem'
import { type ChainVM, type RelayChain } from '@relayprotocol/relay-sdk'
import type {
  FiatCurrency,
  LinkedWallet,
  Token
} from '../../../../types/index.js'
import { ProviderOptionsContext } from '../../../../providers/RelayKitProvider.js'
import {
  findSupportedWallet,
  isChainVmTypeSupported,
  isValidAddress
} from '../../../../utils/address.js'
import useWalletAddress from '../../../../hooks/useWalletAddress.js'
import { useTokenPrice } from '@relayprotocol/relay-kit-hooks'
import { formatBN } from '../../../../utils/numbers.js'
import { UnsupportedDepositAddressChainIds } from '../../../../constants/depositAddresses.js'

export type ChildrenProps = {
  displayCurrency: boolean
  setDisplayCurrency: React.Dispatch<React.SetStateAction<boolean>>
  recipient?: string
  setRecipient: React.Dispatch<React.SetStateAction<string | undefined>>
  isRecipientLinked: boolean
  isValidRecipient: boolean
  amount: string
  setAmount: React.Dispatch<React.SetStateAction<string>>
  amountToToken: string
  setAmountToToken: React.Dispatch<React.SetStateAction<string>>
  setInputValue: (value: string, overrideDisplayCurrency?: boolean) => void
  fiatCurrency: FiatCurrency
  setFiatCurrency: React.Dispatch<React.SetStateAction<FiatCurrency>>
  token: Token
  fromToken: Token
  setToken: React.Dispatch<React.SetStateAction<Token>>
  toChain?: RelayChain
  fromChain?: RelayChain
  toDisplayName?: string
  toChainWalletVMSupported?: boolean
  amountToTokenFormatted?: string
  usdRate: number
  minAmountCurrency?: string
  ctaCopy: string
  notEnoughFiat: boolean
  isPassthrough: boolean
  moonPayCurrencyCode: string
}

type OnrampWidgetRendererProps = {
  defaultWalletAddress?: string
  supportedWalletVMs: Omit<ChainVM, 'hypevm' | 'lvm'>[]
  linkedWallets?: LinkedWallet[]
  multiWalletSupportEnabled?: boolean
  moonPayApiKey: string
  token?: Token
  setToken?: (token: Token) => void
  children: (props: ChildrenProps) => ReactNode
}

const OnrampWidgetRenderer: FC<OnrampWidgetRendererProps> = ({
  defaultWalletAddress,
  linkedWallets,
  supportedWalletVMs,
  multiWalletSupportEnabled,
  moonPayApiKey,
  token: _token,
  setToken: _setToken,
  children
}) => {
  const client = useRelayClient()
  const providerOptionsContext = useContext(ProviderOptionsContext)
  const connectorKeyOverrides = providerOptionsContext.vmConnectorKeyOverrides
  const [token, setToken] = useFallbackState(
    _token && _setToken
      ? _token
      : {
          address: zeroAddress,
          chainId: 8453,
          name: 'ETH',
          symbol: 'ETH',
          decimals: 18,
          logoURI: 'https://assets.relay.link/icons/currencies/eth.png'
        },
    _token && _setToken
      ? [_token, _setToken as Dispatch<SetStateAction<Token>>]
      : undefined
  )
  useEffect(() => {
    if (
      _token &&
      _setToken &&
      UnsupportedDepositAddressChainIds.includes(token.chainId)
    ) {
      setToken({
        address: zeroAddress,
        chainId: 8453,
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
        logoURI: 'https://assets.relay.link/icons/currencies/eth.png'
      })
    }
  }, [_token])

  const [displayCurrency, setDisplayCurrency] = useState(false)
  const { data: usdTokenPriceResponse } = useTokenPrice(
    client?.baseApiUrl,
    {
      address: token.address,
      chainId: token.chainId,
      referrer: client?.source
    },
    {
      refetchInterval: 60000 * 5, //5 minutes
      refetchOnWindowFocus: false
    }
  )
  const usdRate = usdTokenPriceResponse?.price ?? 0
  const minAmountCurrency = formatBN(20 / usdRate, 5, token.decimals, false)

  const toChain = useMemo(
    () => client?.chains.find((chain) => chain.id === token.chainId),
    [token, client?.chains]
  )
  const toChainWalletVMSupported =
    isChainVmTypeSupported(toChain?.vmType, supportedWalletVMs)

  const moonPayCurrency = useSupportedMoonPayCurrencyCode(
    [
      'usdc_base',
      'usdc_polygon',
      'usdc',
      'eth',
      'eth_arbitrum',
      'eth_optimism'
    ],
    moonPayApiKey,
    token
  )

  const fromToken: Token = {
    chainId: +moonPayCurrency.chainId,
    address: moonPayCurrency.contractAddress,
    symbol: moonPayCurrency.code.includes('eth') ? 'ETH' : 'USDC',
    name: moonPayCurrency.code.includes('eth') ? 'ETH' : 'USDC',
    logoURI: moonPayCurrency.code.includes('eth')
      ? 'https://assets.relay.link/icons/1/light.png'
      : 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
    decimals: moonPayCurrency.code.includes('eth') ? 18 : 6
  }

  const fromChain = useMemo(
    () => client?.chains.find((chain) => chain.id === +moonPayCurrency.chainId),
    [fromToken, client?.chains, moonPayCurrency]
  )

  const [amount, setAmount] = useState('20')
  const [amountToToken, setAmountToToken] = useState('')
  const [recipient, setRecipient] = useState<string | undefined>(
    defaultWalletAddress
  )
  const { displayName: toDisplayName } = useDisplayName(
    recipient,
    toChain?.vmType,
    toChain?.id
  )

  const [fiatCurrency, setFiatCurrency] = useState<FiatCurrency>({
    name: 'US Dollar',
    code: 'usd',
    minAmount: 20,
    icon: 'https://static.moonpay.com/widget/currencies/usd.svg'
  })

  const address = useWalletAddress(undefined, linkedWallets)

  const defaultRecipient = useMemo(() => {
    const _linkedWallet = linkedWallets?.find(
      (linkedWallet) =>
        address ===
        (linkedWallet.vmType === 'evm'
          ? linkedWallet.address.toLowerCase()
          : linkedWallet.address)
    )
    const _isValidRecipient = isValidAddress(
      toChain?.vmType,
      recipient ?? '',
      toChain?.id,
      _linkedWallet?.address === recipient
        ? _linkedWallet?.connector
        : undefined,
      connectorKeyOverrides
    )
    if (
      multiWalletSupportEnabled &&
      toChain &&
      linkedWallets &&
      !_isValidRecipient
    ) {
      const supportedAddress = findSupportedWallet(
        toChain,
        recipient,
        linkedWallets,
        connectorKeyOverrides
      )

      return supportedAddress
    }
  }, [
    multiWalletSupportEnabled,
    toChain,
    recipient,
    linkedWallets,
    setRecipient
  ])

  const _recipient =
    recipient && recipient.length > 0 ? recipient : defaultRecipient

  const isRecipientLinked =
    (_recipient
      ? linkedWallets?.find((wallet) => wallet.address === _recipient) ||
        address === _recipient
      : undefined) !== undefined

  const isValidRecipient = isValidAddress(
    toChain?.vmType,
    _recipient ?? '',
    toChain?.id
  )

  const { isPassthrough, moonPayCurrency: passThroughCurrency } =
    useIsPassthrough(token, moonPayApiKey)

  useEffect(() => {
    setInputValue(displayCurrency ? amountToToken : amount)
  }, [usdRate])

  const amountToTokenFormatted = amountToToken
    ? formatBN(parseFloat(amountToToken), 5, token.decimals)
    : '-'

  const setInputValue = useCallback(
    (inputValue: string, overrideDisplayCurrency?: boolean) => {
      const _displayCurrency =
        overrideDisplayCurrency !== undefined
          ? overrideDisplayCurrency
          : displayCurrency
      if (_displayCurrency) {
        const _amountToToken = inputValue.replace(/[^0-9.]+/g, '')
        setAmountToToken(_amountToToken)
        const _amount =
          _amountToToken && +_amountToToken > 0 ? +_amountToToken * usdRate : 0
        setAmount(`${parseFloat(_amount.toFixed(2))}`)
      } else {
        let _amount = ''
        const numericValue = inputValue
          .replace(/[^0-9.]/g, '')
          .replace(/(\..*?)(\..*)/, '$1')
          .replace(/(\.\d{2})\d+/, '$1')
        const regex = /^[0-9]+(\.[0-9]*)?$/
        if (numericValue === '.' || numericValue.includes(',')) {
          _amount = '0.'
        } else if (regex.test(numericValue) || numericValue === '') {
          _amount = numericValue
        }
        const _amountToToken = _amount && +_amount > 0 ? +_amount / usdRate : 0
        setAmount(_amount)
        setAmountToToken(`${_amountToToken}`)
      }
    },
    [usdRate, displayCurrency]
  )

  const notEnoughFiat = !amount || +amount < 20
  let ctaCopy = 'Buy'
  if (notEnoughFiat) {
    ctaCopy = 'Enter an amount'
  } else if (!_recipient && toChainWalletVMSupported) {
    ctaCopy = `Connect Wallet`
  } else if (!_recipient) {
    ctaCopy = `Enter ${toChain?.displayName} address`
  }

  return (
    <>
      {children({
        displayCurrency,
        setDisplayCurrency,
        recipient: _recipient,
        setRecipient,
        isRecipientLinked,
        isValidRecipient,
        amount,
        setAmount,
        amountToToken,
        setAmountToToken,
        setInputValue,
        token,
        fromToken,
        setToken,
        toChain,
        fromChain,
        toDisplayName,
        toChainWalletVMSupported,
        fiatCurrency,
        setFiatCurrency,
        amountToTokenFormatted,
        usdRate,
        minAmountCurrency,
        notEnoughFiat,
        ctaCopy,
        isPassthrough,
        moonPayCurrencyCode:
          isPassthrough && passThroughCurrency?.code
            ? passThroughCurrency?.code
            : moonPayCurrency.code
      })}
    </>
  )
}

export default OnrampWidgetRenderer
