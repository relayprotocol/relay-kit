import { type FC, useState, useEffect, useMemo, useContext } from 'react'
import { Text, Flex, Button, Input, Pill } from '../primitives/index.js'
import { Modal } from '../common/Modal.js'
import { type Address, isAddress } from 'viem'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  useENSResolver,
  useWalletAddress,
  useLighterAccount
} from '../../hooks/index.js'
import { isENSName } from '../../utils/ens.js'
import { LoadingSpinner } from '../common/LoadingSpinner.js'
import { EventNames } from '../../constants/events.js'
import type { Token } from '../../types/index.js'
import {
  faCircleCheck,
  faTriangleExclamation,
  faClipboard,
  faCircleXmark
} from '@fortawesome/free-solid-svg-icons'
import { AnchorButton } from '../primitives/Anchor.js'
import type { AdaptedWallet, RelayChain } from '@relayprotocol/relay-sdk'
import type { LinkedWallet } from '../../types/index.js'
import { truncateAddress } from '../../utils/truncate.js'
import { isValidAddress } from '../../utils/address.js'
import { ProviderOptionsContext } from '../../providers/RelayKitProvider.js'
import {
  addCustomAddress,
  getCustomAddresses
} from '../../utils/localStorage.js'
import { isLighterAddress } from '../../utils/lighter.js'

type Props = {
  open: boolean
  toToken?: Token
  toAddress?: string
  toChain?: RelayChain
  isConnected?: boolean
  multiWalletSupportEnabled?: boolean
  linkedWallets: LinkedWallet[]
  wallet?: AdaptedWallet
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onOpenChange: (open: boolean) => void
  onConfirmed: (address: Address | string) => void
  onClear: () => void
}

export const CustomAddressModal: FC<Props> = ({
  open,
  toAddress,
  toChain,
  linkedWallets,
  isConnected,
  multiWalletSupportEnabled,
  wallet,
  onAnalyticEvent,
  onOpenChange,
  onConfirmed,
  onClear
}) => {
  const connectedAddress = useWalletAddress(wallet, linkedWallets)
  const [address, setAddress] = useState('')
  const [input, setInput] = useState('')
  const [recentCustomAddresses, setRecentCustomAddresses] = useState<string[]>(
    []
  )
  const providerOptionsContext = useContext(ProviderOptionsContext)
  const connectorKeyOverrides = providerOptionsContext.vmConnectorKeyOverrides

  // Lighter: allow resolving EVM address to Lighter account ID (and vice versa)
  const isLighterChain = toChain?.vmType === 'lvm'
  const isEvmInput = isAddress(input)
  const isLighterIndexInput = isLighterAddress(input)

  const {
    data: lighterAccount,
    isLoading: isResolvingLighter,
    isError: isLighterError
  } = useLighterAccount(
    isLighterChain && (isEvmInput || isLighterIndexInput) ? input : undefined
  )

  const resolvedLighterIndex = lighterAccount?.index?.toString()

  const didResolveLighterFromEvm =
    isLighterChain &&
    isEvmInput &&
    !!resolvedLighterIndex &&
    isLighterAddress(resolvedLighterIndex)

  const availableWallets = useMemo(
    () =>
      linkedWallets.filter((wallet) =>
        isValidAddress(
          toChain?.vmType,
          wallet.address,
          toChain?.id,
          wallet.connector,
          connectorKeyOverrides
        )
      ),
    [toChain, linkedWallets]
  )

  const filteredRecentCustomAddresses = useMemo(
    () =>
      recentCustomAddresses.filter((address) =>
        isValidAddress(toChain?.vmType, address, toChain?.id)
      ),
    [recentCustomAddresses, toChain]
  )

  // For Lighter: check if the EVM address (input or resolved) matches connected wallet
  const isLighterConnectedWallet =
    isLighterChain &&
    !!lighterAccount &&
    // User entered EVM address - check if it matches connected wallet
    ((isEvmInput && input.toLowerCase() === connectedAddress?.toLowerCase()) ||
      // User entered Lighter index - check if resolved l1_address matches connected wallet
      (isLighterIndexInput &&
        lighterAccount.l1_address?.toLowerCase() ===
          connectedAddress?.toLowerCase()))

  const connectedAddressSet =
    (!address && !toAddress) ||
    (toAddress === connectedAddress && address === connectedAddress) ||
    availableWallets.some((wallet) => wallet.address === toAddress) ||
    isLighterConnectedWallet

  useEffect(() => {
    if (!open) {
      setAddress('')
      setInput('')
    } else {
      if (isValidAddress(toChain?.vmType, toAddress ?? '', toChain?.id)) {
        setAddress(toAddress ? toAddress : '')
        setInput(toAddress ? toAddress : '')
      }
      // Load custom addresses when modal opens
      setRecentCustomAddresses(getCustomAddresses())
      onAnalyticEvent?.(EventNames.ADDRESS_MODAL_OPEN)
    }
  }, [open])

  const { data: resolvedENS, isLoading: isLoadingENS } = useENSResolver(
    isENSName(input) ? input : ''
  )

  const isLoading = isLoadingENS || isResolvingLighter

  useEffect(() => {
    if (isLighterChain && isEvmInput) {
      setAddress(resolvedLighterIndex ?? '')
    } else if (isValidAddress(toChain?.vmType, input, toChain?.id)) {
      setAddress(input)
    } else if (resolvedENS?.address) {
      setAddress(resolvedENS.address)
    } else {
      setAddress('')
    }
  }, [
    input,
    resolvedENS,
    resolvedLighterIndex,
    isLighterChain,
    isEvmInput,
    toChain
  ])

  return (
    <Modal
      trigger={null}
      open={open}
      onOpenChange={onOpenChange}
      className="relay-overflow-hidden"
    >
      <Flex
        direction="column"
        className="relay-w-full relay-h-full relay-gap-4 sm:relay-w-[386px]"
      >
        <Text style="h6">To Address</Text>
        <Flex direction="column" className="relay-gap-2 relay-relative">
          <Flex
            className="relay-relative relay-inline-block"
          >
            <Input
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              className="ph-no-capture relay-w-full relay-h-12"
              inputStyle={{
                paddingRight: input.length > 0 ? '42px' : '16px'
              }}
              placeholder={
                !toChain
                  ? 'Enter address'
                  : toChain.vmType === 'evm'
                    ? 'Address or ENS'
                    : isLighterChain
                      ? `${toChain.displayName} address or EVM address`
                      : `Enter ${toChain.displayName} address`
              }
              value={input}
              onChange={(e) => {
                setInput((e.target as HTMLInputElement).value)
              }}
            />
            {input.length > 0 && !isLoading && (
              <Button
                color="ghost"
                size="none"
                className="relay-absolute relay-right-2 relay-top-1/2 -relay-translate-y-1/2 relay-w-6 relay-h-6 relay-min-w-[24px] relay-min-h-[24px] relay-p-0 relay-rounded relay-flex relay-items-center relay-justify-center relay-bg-[var(--relay-colors-gray3)] relay-text-[color:var(--relay-colors-gray8)]"
                onMouseDown={(e) => {
                  e.preventDefault() // Prevent input from losing focus
                }}
                onClick={() => {
                  setInput('')
                }}
              >
                <FontAwesomeIcon icon={faCircleXmark} width={16} height={16} />
              </Button>
            )}
            {isLoading && (
              <div className="relay-absolute relay-right-2 relay-top-[12px]">
                <LoadingSpinner />
              </div>
            )}
          </Flex>
          {isLighterError ? (
            <Text color="red" style="subtitle2">
              Failed to resolve Lighter address
            </Text>
          ) : isLighterChain &&
            isEvmInput &&
            !isResolvingLighter &&
            !resolvedLighterIndex ? (
            <Text color="red" style="subtitle2">
              No Lighter account found for this EVM address
            </Text>
          ) : !address && input.length && !isLoading ? (
            <Text color="red" style="subtitle2">
              Not a valid address
            </Text>
          ) : null}

          {didResolveLighterFromEvm && resolvedLighterIndex ? (
            <Flex
              className="relay-bg-[var(--relay-colors-green2)] relay-p-2 relay-rounded-lg relay-gap-2"
              align="center"
            >
              <FontAwesomeIcon
                icon={faCircleCheck}
                color="#30A46C"
                width={16}
                height={16}
              />
              <Text style="subtitle3">
                Lighter Account ID: {resolvedLighterIndex}
              </Text>
            </Flex>
          ) : null}

          {!connectedAddressSet && address && isConnected ? (
            <Flex
              className="relay-bg-[var(--relay-colors-amber2)] relay-p-2 relay-rounded-lg relay-gap-2"
              align="center"
            >
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                color="#FFA01C"
                width={16}
                height={16}
                className="relay-shrink-0"
              />
              <Text style="subtitle3" color="warning">
                This isn't the connected wallet address. Please ensure that the
                address provided is accurate.{' '}
              </Text>
            </Flex>
          ) : null}

          {!multiWalletSupportEnabled && isConnected ? (
            connectedAddressSet ? (
              <Flex
                className="relay-bg-[var(--relay-colors-green2)] relay-p-2 relay-rounded-lg relay-gap-2"
                align="center"
              >
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  color="#30A46C"
                  width={16}
                  height={16}
                />
                <Text style="subtitle3">Connected Wallet</Text>
              </Flex>
            ) : (
              <AnchorButton
                onClick={() => {
                  onClear()
                  onOpenChange(false)
                }}
              >
                Use connected wallet address
              </AnchorButton>
            )
          ) : null}

          {filteredRecentCustomAddresses.length > 0 ? (
            <>
              <Text style="subtitle2">Recent addresses</Text>
              <Flex className="relay-gap-2 relay-flex-wrap" align="center">
                {filteredRecentCustomAddresses.map((address) => (
                  <Pill
                    key={address}
                    color="transparent"
                    bordered
                    radius="squared"
                    className="relay-flex relay-items-center relay-gap-[6px] relay-cursor-pointer relay-px-2"
                    onClick={() => {
                      onConfirmed(address)
                      onOpenChange(false)
                      onAnalyticEvent?.(EventNames.ADDRESS_MODAL_CONFIRMED, {
                        address: address,
                        context: 'custom_address'
                      })
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faClipboard}
                      width={16}
                      height={16}
                      color="#9CA3AF"
                    />
                    <Text style="subtitle2">{truncateAddress(address)}</Text>
                  </Pill>
                ))}
              </Flex>
            </>
          ) : null}
        </Flex>
        <Button
          cta={true}
          disabled={
            isLoading || !isValidAddress(toChain?.vmType, address, toChain?.id)
          }
          className="relay-justify-center"
          onClick={() => {
            if (isValidAddress(toChain?.vmType, address, toChain?.id)) {
              // Save the address to custom addresses if it's not a connected wallet address
              const isConnectedWallet = availableWallets.some(
                (wallet) => wallet.address === address
              )
              if (!isConnectedWallet && address !== connectedAddress) {
                addCustomAddress(address)
                setRecentCustomAddresses(getCustomAddresses())
              }

              onConfirmed(address)
              onAnalyticEvent?.(EventNames.ADDRESS_MODAL_CONFIRMED, {
                address: address,
                context: 'input'
              })
            }
            onOpenChange(false)
          }}
          data-testid="save-button"
        >
          Save
        </Button>
      </Flex>
    </Modal>
  )
}
