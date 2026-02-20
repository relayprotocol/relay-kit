import { useContext, useMemo, useState, type FC } from 'react'
import { Dropdown, DropdownMenuItem } from '../primitives/Dropdown.js'
import { Box, Button, Flex, Text } from '../primitives/index.js'
import type { LinkedWallet } from '../../types/index.js'
import { truncateAddress } from '../../utils/truncate.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faClipboard } from '@fortawesome/free-solid-svg-icons'
import type { RelayChain } from '@relayprotocol/relay-sdk'
import { eclipse, eclipseWallets, solana } from '../../utils/solana.js'
import { useENSResolver } from '../../hooks/index.js'
import { EventNames } from '../../constants/events.js'
import {
  isValidAddress,
  addressesEqual,
  isWalletVmTypeCompatible
} from '../../utils/address.js'
import { ProviderOptionsContext } from '../../providers/RelayKitProvider.js'
import { cn } from '../../utils/cn.js'

type MultiWalletDropdownProps = {
  context: 'origin' | 'destination'
  wallets: LinkedWallet[]
  selectedWalletAddress?: string
  chain?: RelayChain
  disablePasteWalletAddressOption?: boolean
  testId?: string
  onSelect: (wallet: LinkedWallet) => void
  onLinkNewWallet: () => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  setAddressModalOpen?: React.Dispatch<React.SetStateAction<boolean>>
  disableWalletFiltering?: boolean
}

export const MultiWalletDropdown: FC<MultiWalletDropdownProps> = ({
  context,
  wallets,
  selectedWalletAddress,
  chain,
  disablePasteWalletAddressOption,
  testId,
  onSelect,
  onAnalyticEvent,
  onLinkNewWallet,
  setAddressModalOpen,
  disableWalletFiltering = false
}) => {
  const [open, setOpen] = useState(false)
  const providerOptionsContext = useContext(ProviderOptionsContext)
  const connectorKeyOverrides = providerOptionsContext.vmConnectorKeyOverrides
  const filteredWallets = useMemo(() => {
    if (!chain || disableWalletFiltering) return wallets

    let eclipseConnectorKeys: string[] | undefined = undefined
    if (connectorKeyOverrides && connectorKeyOverrides[eclipse.id]) {
      eclipseConnectorKeys = connectorKeyOverrides[eclipse.id]
    } else if (chain.vmType === 'svm') {
      eclipseConnectorKeys = eclipseWallets
    }

    return wallets.filter((wallet) => {
      if (!isWalletVmTypeCompatible(wallet.vmType, chain.vmType)) {
        return false
      }
      if (
        chain.id === eclipse.id &&
        !eclipseConnectorKeys!.includes(wallet.connector.toLowerCase())
      ) {
        return false
      } else if (
        chain.id === solana.id &&
        eclipseConnectorKeys!.includes(wallet.connector.toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [wallets, chain, disableWalletFiltering, connectorKeyOverrides])

  const selectedWallet = useMemo(
    () =>
      wallets.find((wallet) =>
        addressesEqual(wallet.vmType, wallet.address, selectedWalletAddress)
      ),
    [wallets, selectedWalletAddress]
  )

  const isSupportedSelectedWallet = useMemo(
    () =>
      chain
        ? isValidAddress(
            chain?.vmType,
            selectedWalletAddress,
            chain?.id,
            selectedWallet?.connector,
            connectorKeyOverrides
          )
        : true,
    [
      selectedWalletAddress,
      selectedWallet,
      chain?.vmType,
      chain?.id,
      connectorKeyOverrides
    ]
  )

  const showDropdown = context !== 'origin' || filteredWallets.length > 0

  const isEnsCapableVmType =
    chain?.vmType === 'evm' ||
    chain?.vmType === 'hypevm' ||
    selectedWallet?.vmType === 'evm' ||
    selectedWallet?.vmType === 'hypevm'

  const shouldResolveEns = isEnsCapableVmType && isSupportedSelectedWallet

  const { displayName } = useENSResolver(selectedWalletAddress, {
    enabled: shouldResolveEns
  })

  const shouldShowEns = isEnsCapableVmType && Boolean(displayName)

  const dropdownItemClassName =
    'relay-rounded-lg relay-gap-2 relay-cursor-pointer relay-p-2 relay-transition-[backdrop-filter] relay-duration-[250ms] relay-ease-linear hover:relay-brightness-[0.98] relay-shrink-0 relay-content-center relay-w-full'

  return (
    <Dropdown
      open={showDropdown ? open : false}
      onOpenChange={(open) => {
        if (showDropdown) {
          setOpen(open)
          onAnalyticEvent?.(
            open
              ? EventNames.WALLET_SELECTOR_OPEN
              : EventNames.WALLET_SELECTOR_CLOSE,
            {
              context
            }
          )
        }
      }}
      trigger={
        <Button
          aria-label={`Multi wallet dropdown`}
          color={!selectedWallet && selectedWalletAddress ? 'warning' : 'ghost'}
          onClick={() => {
            if (!showDropdown) {
              onLinkNewWallet()
              onAnalyticEvent?.(EventNames.WALLET_SELECTOR_SELECT, {
                context: 'not_connected'
              })
            }
          }}
          size="none"
          corners="pill"
          className="relay-gap-2 !relay-px-2 relay-py-1 relay-cursor-pointer relay-flex relay-content-center"
          data-testid={testId}
        >
          <Flex align="center" className="relay-gap-1 relay-shrink relay-min-w-0">
            {isSupportedSelectedWallet && selectedWallet?.walletLogoUrl ? (
              <img
                src={selectedWallet.walletLogoUrl}
                className="relay-w-[16px] relay-h-[16px] relay-rounded-[4px] relay-shrink-0"
              />
            ) : selectedWalletAddress && !selectedWallet ? (
              <Box className="relay-text-[color:var(--relay-colors-amber11)] relay-shrink-0">
                <FontAwesomeIcon icon={faClipboard} width={16} height={16} />
              </Box>
            ) : null}
            <Text
              style="subtitle2"
              className={cn(
                !selectedWallet && selectedWalletAddress
                  ? 'relay-text-[color:var(--relay-colors-amber11)]'
                  : 'relay-text-[color:var(--relay-colors-anchor-color)]',
                'relay-whitespace-nowrap relay-overflow-hidden relay-text-ellipsis'
              )}
            >
              {isSupportedSelectedWallet &&
              selectedWalletAddress &&
              selectedWalletAddress != ''
                ? shouldShowEns
                  ? displayName
                  : truncateAddress(selectedWalletAddress)
                : 'Select wallet'}
            </Text>
          </Flex>
          {showDropdown && (
            <Box
              className={cn(
                !selectedWallet && selectedWalletAddress
                  ? 'relay-text-[color:var(--relay-colors-amber11)]'
                  : 'relay-text-[color:var(--relay-colors-anchor-color)]',
                'relay-shrink-0'
              )}
            >
              <FontAwesomeIcon icon={faChevronDown} width={14} height={14} />
            </Box>
          )}
        </Button>
      }
      contentProps={{
        sideOffset: 12,
        alignOffset: -12,
        align: 'end',
        className: 'relay-max-w-[248px] relay-p-0'
      }}
    >
      <Flex direction="column" className="relay-rounded-[12px] relay-p-1 relay-gap-1">
        {filteredWallets.map((wallet, idx) => {
          return (
            <DropdownMenuItem
              aria-label={wallet.address}
              key={idx}
              onClick={() => {
                onAnalyticEvent?.(EventNames.WALLET_SELECTOR_SELECT, {
                  context: 'select_option',
                  wallet_address: wallet.address,
                  wallet_vm: wallet.vmType,
                  wallet_icon: wallet.walletLogoUrl ?? ''
                })
                setOpen(false)
                onSelect(wallet)
              }}
              className={cn(
                dropdownItemClassName,
                'relay-border relay-border-solid relay-border-[var(--relay-colors-gray-6)]'
              )}
            >
              {wallet.walletLogoUrl ? (
                <img
                  src={wallet.walletLogoUrl}
                  className="relay-w-[16px] relay-h-[16px] relay-rounded-[4px]"
                />
              ) : null}

              <Text style="subtitle2">{truncateAddress(wallet.address)}</Text>
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuItem
          aria-label="Connect a new wallet"
          className={dropdownItemClassName}
          onClick={() => {
            onAnalyticEvent?.(EventNames.WALLET_SELECTOR_SELECT, {
              context: 'link_option'
            })
            onLinkNewWallet()
          }}
        >
          <Text style="subtitle2">Connect a new wallet</Text>
        </DropdownMenuItem>

        {context === 'destination' && !disablePasteWalletAddressOption ? (
          <DropdownMenuItem
            aria-label="Paste wallet address"
            className={dropdownItemClassName}
            onClick={() => {
              onAnalyticEvent?.(EventNames.WALLET_SELECTOR_SELECT, {
                context: 'custom_option'
              })
              setAddressModalOpen?.(true)
            }}
          >
            <Text style="subtitle2">Paste wallet address</Text>
          </DropdownMenuItem>
        ) : null}
      </Flex>
    </Dropdown>
  )
}

export type { MultiWalletDropdownProps }
