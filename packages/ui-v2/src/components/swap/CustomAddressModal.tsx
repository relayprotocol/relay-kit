import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils.js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton
} from '@/components/ui/dialog.js'
import {
  isENSName,
  isLighterAddress,
  isValidAddress,
  truncateAddress
} from '@/lib/address.js'
import { addCustomAddress, getCustomAddresses } from '@/lib/localStorage.js'
import { useENSResolver } from '@/hooks/useENSResolver.js'
import { useLighterAccount } from '@/hooks/useLighterAccount.js'
import type { LinkedWallet } from '@/types/token.js'
import type { RelayChain } from '@relayprotocol/relay-sdk'

interface CustomAddressModalProps {
  open: boolean
  toChain?: RelayChain
  linkedWallets?: LinkedWallet[]
  onConfirmed: (address: string) => void
  onClear: () => void
  onOpenChange: (open: boolean) => void
}

/**
 * Modal for entering a custom recipient address.
 * Supports ENS resolution, Lighter account lookup, and recent address recall.
 */
export const CustomAddressModal: React.FC<CustomAddressModalProps> = ({
  open,
  toChain,
  linkedWallets,
  onConfirmed,
  onClear,
  onOpenChange
}) => {
  const [input, setInput] = React.useState('')
  const [recentAddresses, setRecentAddresses] = React.useState<string[]>([])

  // Load recent addresses on open
  React.useEffect(() => {
    if (open) {
      setInput('')
      setRecentAddresses(getCustomAddresses())
    }
  }, [open])

  const isEns = isENSName(input)
  const isLighterChain = toChain?.vmType === 'lvm'
  const isLighterNumeric = isLighterChain && isLighterAddress(input)
  const isLighterEvm = isLighterChain && !isLighterNumeric && input.startsWith('0x')

  // ENS resolution
  const { data: ensData, isFetching: isResolvingEns } = useENSResolver(
    input,
    isEns && open
  )

  // Lighter resolution (EVM address on LVM chain → resolve index)
  const { data: lighterData, isFetching: isResolvingLighter } = useLighterAccount(
    input,
    isLighterEvm && open
  )

  // Derive the final resolved address
  const resolvedAddress = React.useMemo(() => {
    if (isEns && ensData?.address) return ensData.address
    if (isLighterEvm && lighterData) return String(lighterData.index)
    return input
  }, [isEns, ensData, isLighterEvm, lighterData, input])

  const isResolving = isResolvingEns || isResolvingLighter

  const isAddressValid = React.useMemo(() => {
    if (!resolvedAddress || isResolving) return false
    return isValidAddress(toChain?.vmType, resolvedAddress, toChain?.id)
  }, [resolvedAddress, toChain, isResolving])

  // Filter recent addresses to only valid ones for this chain
  const validRecentAddresses = React.useMemo(
    () =>
      recentAddresses.filter((a) =>
        isValidAddress(toChain?.vmType, a, toChain?.id)
      ),
    [recentAddresses, toChain]
  )

  const handleConfirm = () => {
    if (!isAddressValid) return
    addCustomAddress(resolvedAddress)
    onConfirmed(resolvedAddress)
    onOpenChange(false)
  }

  const resolvedDisplay = React.useMemo(() => {
    if (isEns && ensData?.address) {
      return truncateAddress(ensData.address)
    }
    if (isLighterEvm && lighterData) {
      return `${lighterData.index} (${truncateAddress(lighterData.l1_address)})`
    }
    return null
  }, [isEns, ensData, isLighterEvm, lighterData])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px] w-full p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Enter address</DialogTitle>
          <DialogCloseButton />
        </DialogHeader>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {/* Input */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
                placeholder={
                  isLighterChain
                    ? 'Address or Lighter index'
                    : toChain?.vmType === 'evm' || !toChain
                    ? 'Address or ENS name'
                    : 'Address'
                }
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className={cn(
                  'w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring font-mono',
                  'placeholder:text-muted-foreground placeholder:font-sans pr-8'
                )}
              />
              {isResolving && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Resolved address display */}
            {resolvedDisplay && !isResolving && (
              <p className="text-xs text-muted-foreground px-1">
                Resolves to:{' '}
                <span className="font-mono text-foreground">{resolvedDisplay}</span>
              </p>
            )}
          </div>

          {/* Recent addresses */}
          {validRecentAddresses.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent
              </span>
              <div className="flex flex-wrap gap-2">
                {validRecentAddresses.map((addr) => (
                  <button
                    key={addr}
                    type="button"
                    onClick={() => setInput(addr)}
                    className={cn(
                      'rounded-full border border-border px-3 py-1 text-xs font-mono',
                      'hover:bg-accent transition-colors duration-100',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      input === addr && 'bg-accent border-primary/30'
                    )}
                  >
                    {truncateAddress(addr)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onClear()
                onOpenChange(false)
              }}
              className={cn(
                'flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium',
                'hover:bg-accent transition-colors duration-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isAddressValid}
              className={cn(
                'flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground',
                'hover:opacity-90 transition-opacity',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              Confirm
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
