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
import { isValidAddress, addressesEqual } from '../../utils/address.js'
import { ProviderOptionsContext } from '../../providers/RelayKitProvider.js'

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
  setAddressModalOpen
}) => {
  const [open, setOpen] = useState(false)
  const providerOptionsContext = useContext(ProviderOptionsContext)
  const connectorKeyOverrides = providerOptionsContext.vmConnectorKeyOverrides
  const filteredWallets = useMemo(() => {
    if (!chain) return wallets

    let eclipseConnectorKeys: string[] | undefined = undefined
    if (connectorKeyOverrides && connectorKeyOverrides[eclipse.id]) {
      eclipseConnectorKeys = connectorKeyOverrides[eclipse.id]
    } else if (chain.vmType === 'svm') {
      eclipseConnectorKeys = eclipseWallets
    }

    return wallets.filter((wallet) => {
      if (wallet.vmType !== chain.vmType) {
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
  }, [wallets, chain])

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

  const { displayName } = useENSResolver(selectedWalletAddress, {
    enabled:
      (chain?.vmType === 'evm' || chain?.vmType === 'hypevm') &&
      isSupportedSelectedWallet
  })

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
          css={{
            gap: '2',
            px: '2 !important',
            py: '1',
            cursor: 'pointer',
            display: 'flex',
            alignContent: 'center'
          }}
          data-testid={testId}
        >
          <Flex align="center" css={{ gap: '1' }}>
            {isSupportedSelectedWallet && selectedWallet?.walletLogoUrl ? (
              <img
                src={selectedWallet.walletLogoUrl}
                style={{ width: 16, height: 16, borderRadius: 4 }}
              />
            ) : selectedWalletAddress && !selectedWallet ? (
              <Box css={{ color: 'amber11' }}>
                <FontAwesomeIcon icon={faClipboard} width={16} height={16} />
              </Box>
            ) : null}
            <Text
              style="subtitle2"
              css={{
                color:
                  !selectedWallet && selectedWalletAddress
                    ? 'amber11'
                    : 'anchor-color'
              }}
            >
              {isSupportedSelectedWallet &&
              selectedWalletAddress &&
              selectedWalletAddress != ''
                ? displayName &&
                  (chain?.vmType === 'evm' || chain?.vmType === 'hypevm')
                  ? displayName
                  : truncateAddress(selectedWalletAddress)
                : 'Select wallet'}
            </Text>
          </Flex>
          {showDropdown && (
            <Box
              css={{
                color:
                  !selectedWallet && selectedWalletAddress
                    ? 'amber11'
                    : 'anchor-color'
              }}
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
        css: { maxWidth: 248, p: 0 }
      }}
    >
      <Flex direction="column" css={{ borderRadius: 12, p: '1', gap: '1' }}>
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
              css={{
                ...DropdownItemBaseStyle,
                '--borderColor': 'colors.gray.6',
                border: '1px solid var(--borderColor)'
              }}
            >
              {wallet.walletLogoUrl ? (
                <img
                  src={wallet.walletLogoUrl}
                  style={{ width: 16, height: 16, borderRadius: 4 }}
                />
              ) : null}

              <Text style="subtitle2">{truncateAddress(wallet.address)}</Text>
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuItem
          aria-label="Connect a new wallet"
          css={{
            ...DropdownItemBaseStyle
          }}
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
            css={{
              ...DropdownItemBaseStyle
            }}
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

const DropdownItemBaseStyle = {
  borderRadius: 8,
  gap: '2',
  cursor: 'pointer',
  p: '2',
  transition: 'backdrop-filter 250ms linear',
  _hover: {
    backdropFilter: 'brightness(98%)'
  },
  flexShrink: 0,
  alignContent: 'center',
  width: '100%'
}
