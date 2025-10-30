import { useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import type { LinkedWallet } from '../../../../types/index.js'
import type { RelayKitProviderProps } from '../../../../providers/RelayKitProvider.js'
import { addressesEqual, findSupportedWallet } from '../../../../utils/address.js'

type Params = {
  multiWalletSupportEnabled: boolean
  allowUnsupportedOrigin: boolean
  allowUnsupportedRecipient: boolean
  fromChain?: RelayChain
  toChain?: RelayChain
  address?: string
  recipient?: string
  linkedWallets?: LinkedWallet[]
  connectorKeyOverrides?: RelayKitProviderProps['options']['vmConnectorKeyOverrides']
  onSetPrimaryWallet?: (address: string) => void
  isValidFromAddress: boolean
  isValidToAddress: boolean
  setOriginAddressOverride: Dispatch<SetStateAction<string | undefined>>
  setCustomToAddress: Dispatch<SetStateAction<string | undefined>>
  disablePasteWalletAddressOption?: boolean
  customToAddress?: string
  originAddressOverride?: string
  destinationAddressOverride?: string
  setDestinationAddressOverride: Dispatch<SetStateAction<string | undefined>>
}

export const useWalletGuards = ({
  multiWalletSupportEnabled,
  allowUnsupportedOrigin,
  allowUnsupportedRecipient,
  fromChain,
  toChain,
  address,
  recipient,
  linkedWallets,
  connectorKeyOverrides,
  onSetPrimaryWallet,
  isValidFromAddress,
  isValidToAddress,
  setOriginAddressOverride,
  setCustomToAddress,
  disablePasteWalletAddressOption,
  customToAddress,
  originAddressOverride,
  destinationAddressOverride,
  setDestinationAddressOverride
}: Params) => {
  useEffect(() => {
    if (
      !allowUnsupportedOrigin &&
      multiWalletSupportEnabled &&
      fromChain &&
      address &&
      linkedWallets &&
      !isValidFromAddress
    ) {
      const supportedAddress = findSupportedWallet(
        fromChain,
        address,
        linkedWallets,
        connectorKeyOverrides
      )
      if (supportedAddress) {
        setOriginAddressOverride(undefined)
        onSetPrimaryWallet?.(supportedAddress)
      }
    }

    if (
      !allowUnsupportedRecipient &&
      multiWalletSupportEnabled &&
      toChain &&
      recipient &&
      linkedWallets &&
      !isValidToAddress
    ) {
      const supportedAddress = findSupportedWallet(
        toChain,
        recipient,
        linkedWallets,
        connectorKeyOverrides
      )
      if (supportedAddress) {
        setCustomToAddress(supportedAddress)
      } else {
        setCustomToAddress(undefined)
      }
    }
  }, [
    allowUnsupportedOrigin,
    allowUnsupportedRecipient,
    multiWalletSupportEnabled,
    fromChain?.id,
    toChain?.id,
    address,
    recipient,
    linkedWallets,
    onSetPrimaryWallet,
    isValidFromAddress,
    isValidToAddress,
    connectorKeyOverrides,
    setOriginAddressOverride,
    setCustomToAddress
  ])

  useEffect(() => {
    if (!disablePasteWalletAddressOption || !customToAddress) {
      return
    }

    const isLinkedWallet = linkedWallets?.some((wallet) =>
      addressesEqual(wallet.vmType, wallet.address, customToAddress)
    )

    if (!isLinkedWallet) {
      setCustomToAddress(undefined)
    }
  }, [
    disablePasteWalletAddressOption,
    customToAddress,
    linkedWallets,
    setCustomToAddress
  ])

  useEffect(() => {
    if (
      destinationAddressOverride &&
      customToAddress &&
      destinationAddressOverride !== customToAddress
    ) {
      setDestinationAddressOverride(undefined)
    }
  }, [destinationAddressOverride, customToAddress, setDestinationAddressOverride])

  useEffect(() => {
    if (!multiWalletSupportEnabled) {
      if (originAddressOverride !== undefined) {
        setOriginAddressOverride(undefined)
      }
      if (destinationAddressOverride !== undefined) {
        setDestinationAddressOverride(undefined)
      }
      return
    }

    if (originAddressOverride) {
      const originMatches = linkedWallets?.some((wallet) =>
        addressesEqual(wallet.vmType, wallet.address, originAddressOverride)
      )

      if (!originMatches) {
        setOriginAddressOverride(undefined)
      }
    }

    if (destinationAddressOverride) {
      const destinationMatches = linkedWallets?.some((wallet) =>
        addressesEqual(wallet.vmType, wallet.address, destinationAddressOverride)
      )

      if (!destinationMatches) {
        setDestinationAddressOverride(undefined)
      }
    }
  }, [
    multiWalletSupportEnabled,
    linkedWallets,
    originAddressOverride,
    destinationAddressOverride,
    setOriginAddressOverride,
    setDestinationAddressOverride
  ])
}

export type { Params as UseWalletGuardsParams }
