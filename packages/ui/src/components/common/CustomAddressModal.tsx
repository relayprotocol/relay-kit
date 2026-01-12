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
      css={{
        overflow: 'hidden'
      }}
    >
      <Flex
        direction="column"
        css={{
          width: '100%',
          height: '100%',
          gap: '4',
          sm: {
            width: 386
          }
        }}
      >
        <Text style="h6">To Address</Text>
        <Flex direction="column" css={{ gap: '2', position: 'relative' }}>
          <Flex
            css={{
              position: 'relative',
              display: 'inline-block'
            }}
          >
            <Input
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              className="ph-no-capture"
              css={{
                width: '100%',
                height: 48
              }}
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
                css={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '24px',
                  height: '24px',
                  minWidth: '24px',
                  minHeight: '24px',
                  padding: '0',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'gray3',
                  color: 'gray8'
                }}
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
              <LoadingSpinner
                css={{
                  right: 2,
                  top: 3,
                  position: 'absolute'
                }}
              />
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
              css={{ bg: 'green2', p: '2', borderRadius: 8, gap: '2' }}
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
              css={{ bg: 'amber2', p: '2', borderRadius: 8, gap: '2' }}
              align="center"
            >
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                color="#FFA01C"
                width={16}
                height={16}
                style={{ flexShrink: 0 }}
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
                css={{ bg: 'green2', p: '2', borderRadius: 8, gap: '2' }}
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
              <Flex css={{ gap: '2', flexWrap: 'wrap' }} align="center">
                {filteredRecentCustomAddresses.map((address) => (
                  <Pill
                    key={address}
                    color="transparent"
                    bordered
                    radius="squared"
                    css={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      px: '8px'
                    }}
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
          css={{ justifyContent: 'center' }}
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
