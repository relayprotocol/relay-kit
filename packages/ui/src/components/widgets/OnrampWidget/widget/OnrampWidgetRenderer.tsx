import { useQuote } from '@reservoir0x/relay-kit-hooks'
import { useContext, useMemo, useState, type FC, type ReactNode } from 'react'
import useRelayClient from '../../../../hooks/useRelayClient.js'
import { parseUnits, zeroAddress } from 'viem'
import {
  getDeadAddress,
  type ChainVM,
  type Execute,
  type RelayChain
} from '@reservoir0x/relay-sdk'
import { extractDepositAddress } from '../../../../utils/quote.js'
import type {
  FiatCurrency,
  LinkedWallet,
  Token
} from '../../../../types/index.js'
import useENSResolver from '../../../../hooks/useENSResolver.js'
import { ProviderOptionsContext } from '../../../../providers/RelayKitProvider.js'
import {
  findSupportedWallet,
  isValidAddress
} from '../../../../utils/address.js'
import useWalletAddress from '../../../../hooks/useWalletAddress.js'

export type ChildrenProps = {
  depositAddress?: string
  recipient?: string
  setRecipient: React.Dispatch<React.SetStateAction<string | undefined>>
  isRecipientLinked: boolean
  isValidRecipient: boolean
  amount: string
  setAmount: React.Dispatch<React.SetStateAction<string>>
  fiatCurrency: FiatCurrency
  setFiatCurrency: React.Dispatch<React.SetStateAction<FiatCurrency>>
  token: Token
  fromToken: Token
  setToken: React.Dispatch<React.SetStateAction<Token>>
  toChain?: RelayChain
  fromChain?: RelayChain
  toDisplayName?: string
  toChainWalletVMSupported?: boolean
  totalAmount: string | null
  quote?: Execute
}

type OnrampWidgetRendererProps = {
  defaultWalletAddress?: string
  supportedWalletVMs: ChainVM[]
  linkedWallets?: LinkedWallet[]
  multiWalletSupportEnabled?: boolean
  children: (props: ChildrenProps) => ReactNode
}

const OnrampWidgetRenderer: FC<OnrampWidgetRendererProps> = ({
  defaultWalletAddress,
  linkedWallets,
  supportedWalletVMs,
  multiWalletSupportEnabled,
  children
}) => {
  const client = useRelayClient()
  const providerOptionsContext = useContext(ProviderOptionsContext)
  const connectorKeyOverrides = providerOptionsContext.vmConnectorKeyOverrides
  const [token, setToken] = useState<Token>({
    address: zeroAddress,
    chainId: 1,
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://assets.relay.link/icons/currencies/eth.png'
  })
  const toChain = useMemo(
    () => client?.chains.find((chain) => chain.id === token.chainId),
    [token, client?.chains]
  )
  const toChainWalletVMSupported =
    !toChain?.vmType || supportedWalletVMs.includes(toChain?.vmType)

  const fromChain = useMemo(
    () =>
      client?.chains.find(
        (chain) => chain.id === (token.chainId === 8453 ? 10 : 8453)
      ),
    [token, client?.chains]
  )
  const fromCurrency =
    fromChain && fromChain.id === 8453
      ? '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
      : '0x0b2c639c533813f4aa9d7837caf62653d097ff85'
  const fromToken: Token = {
    chainId: fromChain?.id ?? 8453,
    address: fromCurrency,
    symbol: 'USDC',
    name: 'USDC',
    logoURI:
      'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
    decimals: 6
  }

  const [amount, setAmount] = useState('20')
  const [recipient, setRecipient] = useState<string | undefined>(
    defaultWalletAddress
  )
  const { displayName: toDisplayName } = useENSResolver(recipient, {
    enabled: toChain?.vmType === 'evm'
  })

  const [fiatCurrency, setFiatCurrency] = useState<FiatCurrency>({
    name: 'US Dollar',
    code: 'usd',
    minAmount: '20',
    icon: 'https://static.moonpay.com/widget/currencies/usd.svg'
  })

  const address = useWalletAddress(undefined, linkedWallets)

  const defaultRecipient = useMemo(() => {
    const _linkedWallet = linkedWallets?.find(
      (linkedWallet) => recipient === linkedWallet.address
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

  const quote = useQuote(
    client ?? undefined,
    undefined,
    {
      originChainId: fromToken.chainId,
      originCurrency: fromToken.address,
      destinationChainId: token?.chainId,
      destinationCurrency: token?.address,
      useDepositAddress: true,
      tradeType: 'EXACT_INPUT',
      amount: parseUnits(amount, 6).toString(),
      user: getDeadAddress(),
      recipient: _recipient
    },
    undefined,
    undefined,
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: _recipient !== undefined
    }
  )

  const depositAddress = useMemo(
    () => extractDepositAddress(quote?.data?.steps as Execute['steps']),
    [quote]
  )

  const totalAmount =
    quote.data?.fees && amount
      ? `${
          Math.floor(
            (Number(quote.data.fees.relayer?.amountUsd ?? 0) +
              Number(quote.data.fees.gas?.amountUsd ?? 0) +
              Number(quote.data.fees.app?.amountUsd ?? 0) +
              +amount) *
              100
          ) / 100
        }`
      : null

  return (
    <>
      {children({
        depositAddress,
        recipient: _recipient,
        setRecipient,
        isRecipientLinked,
        isValidRecipient,
        amount,
        setAmount,
        token,
        fromToken,
        setToken,
        toChain,
        fromChain,
        toDisplayName,
        toChainWalletVMSupported,
        fiatCurrency,
        setFiatCurrency,
        totalAmount,
        quote: quote.data as Execute
      })}
    </>
  )
}

export default OnrampWidgetRenderer
