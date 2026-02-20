import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Wallet, ChevronDown, Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import { truncateAddress, isWalletVmTypeCompatible } from '@/lib/address.js'
import type { LinkedWallet } from '@/types/token.js'
import type { ChainVM } from '@relayprotocol/relay-sdk'

interface OriginWalletSelectorProps {
  fromChainVmType?: ChainVM
  linkedWallets?: LinkedWallet[]
  /** The currently active from-address */
  selectedAddress?: string
  /** The default from address (from wagmi) */
  fromAddress?: string
  onSelect: (address: string | undefined) => void
  /** Called when user wants to connect a new wallet */
  onConnectWallet?: () => void
  className?: string
}

/**
 * Compact origin wallet selector for the "Sell" (from) side of the swap.
 * Renders inside the Sell panel via the walletSlot prop.
 * Filters linked wallets by the from chain VM type.
 * Selecting undefined resets to the default wallet.
 */
export const OriginWalletSelector: React.FC<OriginWalletSelectorProps> = ({
  fromChainVmType,
  linkedWallets,
  selectedAddress,
  fromAddress,
  onSelect,
  onConnectWallet,
  className
}) => {
  const [open, setOpen] = React.useState(false)

  const compatibleWallets = React.useMemo<LinkedWallet[]>(() => {
    if (!linkedWallets) return []
    if (!fromChainVmType) return linkedWallets
    return linkedWallets.filter((w) =>
      isWalletVmTypeCompatible(w.vmType, fromChainVmType)
    )
  }, [linkedWallets, fromChainVmType])

  // Only render when there are multiple compatible wallets or a connect option
  if (compatibleWallets.length < 2 && !onConnectWallet) return null

  const activeAddress = selectedAddress ?? fromAddress
  const displayAddress = activeAddress ? truncateAddress(activeAddress) : 'From wallet'

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`Origin wallet: ${displayAddress}. Click to change`}
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
          {compatibleWallets.length > 0 && (
            <>
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  From wallet
                </span>
              </div>

              {compatibleWallets.map((wallet) => {
                const isSelected = activeAddress === wallet.address
                return (
                  <button
                    key={wallet.address}
                    type="button"
                    onClick={() => {
                      onSelect(wallet.address === fromAddress ? undefined : wallet.address)
                      setOpen(false)
                    }}
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

          {/* Connect new wallet */}
          {onConnectWallet && (
            <>
              {compatibleWallets.length > 0 && (
                <div className="my-1 border-t border-border" />
              )}
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
            </>
          )}

          <PopoverPrimitive.Arrow className="fill-border" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
