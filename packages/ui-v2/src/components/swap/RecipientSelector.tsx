import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Wallet, ChevronDown, X, Check, PenLine, Plus } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import { truncateAddress, isWalletVmTypeCompatible } from '@/lib/address.js'
import { useENSResolver } from '@/hooks/useENSResolver.js'
import { CustomAddressModal } from './CustomAddressModal.js'
import type { LinkedWallet } from '@/types/token.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'

interface RecipientSelectorProps {
  /** The currently active recipient address (undefined = use connected wallet) */
  recipient?: string
  /** All linked wallets from the parent app */
  linkedWallets?: LinkedWallet[]
  /** Destination chain — used to filter compatible wallets and validate custom addresses */
  toChain?: RelayChain
  /** Address of the primary/from wallet — shown as default option */
  fromAddress?: string
  /** Callback to change recipient (undefined = reset to default) */
  onSelectRecipient: (address: string | undefined) => void
  /** Called when user wants to connect a new wallet */
  onConnectWallet?: () => void
  className?: string
}

/**
 * Destination wallet selector for the "Buy" (to) side of the swap.
 * Rendered inside the Buy TokenPanel via the walletSlot prop.
 * Shows the current recipient (with ENS display if available).
 * Opens a popover to switch between linked wallets or enter a custom address.
 */
export const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  recipient,
  linkedWallets,
  toChain,
  fromAddress,
  onSelectRecipient,
  onConnectWallet,
  className
}) => {
  const [open, setOpen] = React.useState(false)
  const [addressModalOpen, setAddressModalOpen] = React.useState(false)

  // Resolve ENS name for the current recipient
  const { data: ensData } = useENSResolver(
    recipient ?? '',
    !!recipient && open
  )

  // Filter linked wallets by destination chain VM type compatibility
  const compatibleWallets = React.useMemo<LinkedWallet[]>(() => {
    if (!linkedWallets) return []
    const vmType = toChain?.vmType
    if (!vmType) return linkedWallets
    return linkedWallets.filter((w) =>
      isWalletVmTypeCompatible(w.vmType, vmType)
    )
  }, [linkedWallets, toChain])

  const displayAddress = React.useMemo(() => {
    if (!recipient) return 'To wallet'
    if (ensData?.displayName) return ensData.displayName
    return truncateAddress(recipient)
  }, [recipient, ensData])

  const handleSelectWallet = (wallet: LinkedWallet) => {
    onSelectRecipient(wallet.address)
    setOpen(false)
  }

  const handleClear = () => {
    onSelectRecipient(undefined)
    setOpen(false)
  }

  return (
    <>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-label={`Recipient: ${displayAddress}. Click to change`}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-1',
              'text-xs text-muted-foreground font-mono',
              'hover:bg-accent hover:text-foreground transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              className
            )}
          >
            <Wallet className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{displayAddress}</span>
            {recipient && recipient !== fromAddress && (
              <button
                type="button"
                aria-label="Clear custom recipient"
                onClick={(e) => { e.stopPropagation(); handleClear() }}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            className={cn(
              'z-50 w-72 rounded-xl border border-border bg-popover shadow-lg',
              'focus:outline-none p-1'
            )}
          >
            {/* Connected wallets */}
            {compatibleWallets.length > 0 && (
              <>
                <div className="px-3 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Connected wallets
                  </span>
                </div>
                {compatibleWallets.map((wallet) => {
                  const isSelected = recipient === wallet.address
                  return (
                    <button
                      key={wallet.address}
                      type="button"
                      onClick={() => handleSelectWallet(wallet)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5',
                        'text-sm transition-colors duration-100',
                        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected && 'bg-primary/10'
                      )}
                    >
                      {wallet.walletLogoUrl ? (
                        <img
                          src={wallet.walletLogoUrl}
                          alt=""
                          aria-hidden="true"
                          className="h-5 w-5 rounded-full bg-muted shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-muted shrink-0 flex items-center justify-center">
                          <Wallet className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-xs font-mono truncate">
                          {truncateAddress(wallet.address)}
                        </div>
                        <div className="text-[10px] text-muted-foreground capitalize">
                          {wallet.connector}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  )
                })}
              </>
            )}

            {/* Divider */}
            {compatibleWallets.length > 0 && (
              <div className="my-1 border-t border-border" />
            )}

            {/* Enter custom address */}
            <button
              type="button"
              onClick={() => { setOpen(false); setAddressModalOpen(true) }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm',
                'text-muted-foreground hover:bg-accent hover:text-foreground',
                'transition-colors duration-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <PenLine className="h-4 w-4 shrink-0" aria-hidden="true" />
              Enter address
            </button>

            {/* Connect new wallet */}
            {onConnectWallet && (
              <button
                type="button"
                onClick={() => { onConnectWallet(); setOpen(false) }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm',
                  'text-muted-foreground hover:bg-accent hover:text-foreground',
                  'transition-colors duration-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                Connect new wallet
              </button>
            )}

            <PopoverPrimitive.Arrow className="fill-border" />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {/* Custom address modal */}
      <CustomAddressModal
        open={addressModalOpen}
        toChain={toChain}
        linkedWallets={linkedWallets}
        onConfirmed={(addr) => {
          onSelectRecipient(addr)
          setAddressModalOpen(false)
        }}
        onClear={handleClear}
        onOpenChange={setAddressModalOpen}
      />
    </>
  )
}
