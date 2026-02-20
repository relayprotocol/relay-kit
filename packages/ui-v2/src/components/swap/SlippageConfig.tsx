import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Settings2, Info } from 'lucide-react'
import { useMediaQuery } from 'usehooks-ts'
import { cn } from '@/lib/utils.js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton
} from '@/components/ui/dialog.js'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.js'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip.js'
import { EventNames } from '@/constants/events.js'

type SlippageMode = 'Auto' | 'Custom'

interface SlippageConfigProps {
  /** Current slippage value (undefined = auto) */
  value?: string
  onChange: (value?: string) => void
  onAnalyticEvent?: (eventName: string, data?: Record<string, unknown>) => void
  /**
   * When true, renders as a compact gear icon button (for use in headers).
   * Desktop: Popover. Mobile: Dialog.
   */
  compact?: boolean
  className?: string
}

const SLIPPAGE_PRESETS = ['0.5', '1', '3']

/**
 * Slippage tolerance configuration.
 *
 * Two modes:
 * - Default: card-style row with "Max Slippage … Auto ▾"
 * - compact=true: small gear icon button — used in the widget header
 *
 * Mobile: opens as a Dialog (bottom sheet).
 * Desktop: opens as a Popover.
 */
export const SlippageConfig: React.FC<SlippageConfigProps> = ({
  value,
  onChange,
  onAnalyticEvent,
  compact = false,
  className
}) => {
  const isMobile = useMediaQuery('(max-width: 640px)')
  const [open, setOpen] = React.useState(false)
  const [mode, setMode] = React.useState<SlippageMode>(value ? 'Custom' : 'Auto')
  const [customValue, setCustomValue] = React.useState(value ?? '')
  const [announcement, setAnnouncement] = React.useState('')

  const displayValue = mode === 'Auto' ? 'Auto' : (value ? `${value}%` : 'Auto')
  const isAutoSlippage = mode === 'Auto' || !value

  const handleModeChange = (newMode: string) => {
    const m = newMode as SlippageMode
    setMode(m)
    if (m === 'Auto') {
      onChange(undefined)
      setAnnouncement('Slippage set to auto')
      onAnalyticEvent?.(EventNames.SWAP_SLIPPAGE_TOLERANCE_SET, { mode: 'Auto' })
    }
  }

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setCustomValue(raw)
      if (raw) {
        onChange(raw)
        setAnnouncement(`Slippage set to ${raw}%`)
        onAnalyticEvent?.(EventNames.SWAP_SLIPPAGE_TOLERANCE_SET, {
          mode: 'Custom',
          value: raw
        })
      }
    }
  }

  const handlePresetClick = (preset: string) => {
    setCustomValue(preset)
    onChange(preset)
    setMode('Custom')
    setAnnouncement(`Slippage set to ${preset}%`)
    onAnalyticEvent?.(EventNames.SWAP_SLIPPAGE_TOLERANCE_SET, {
      mode: 'Custom',
      value: preset
    })
  }

  const configContent = (
    <div className="flex flex-col gap-3 p-4">
      {/* a11y: announce slippage changes to screen readers */}
      <div aria-live="polite" className="sr-only">{announcement}</div>

      <Tabs
        value={mode}
        onValueChange={handleModeChange}
        className="w-full"
      >
        <TabsList className="w-full">
          <TabsTrigger value="Auto" className="flex-1">Auto</TabsTrigger>
          <TabsTrigger value="Custom" className="flex-1">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="Auto" className="mt-3">
          <p className="text-xs text-muted-foreground">
            Relay automatically selects the best slippage tolerance for your swap.
          </p>
        </TabsContent>

        <TabsContent value="Custom" className="mt-3 flex flex-col gap-2">
          {/* Preset buttons */}
          <div className="flex gap-2">
            {SLIPPAGE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'flex-1 rounded-md border px-2 py-1.5 text-xs font-medium',
                  'transition-colors duration-100',
                  'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  customValue === preset
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                )}
              >
                {preset}%
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={customValue}
              onChange={handleCustomInput}
              placeholder="Custom"
              aria-label="Custom slippage percentage"
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 pr-7 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'placeholder:text-muted-foreground'
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              %
            </span>
          </div>

          {/* Slippage warning */}
          {customValue && Number(customValue) >= 6 && (
            <p className={cn(
              'text-xs',
              Number(customValue) >= 40 ? 'text-destructive' : 'text-amber-500'
            )}>
              {Number(customValue) >= 40
                ? 'Very high slippage — you may lose most of your funds'
                : 'High slippage — your transaction may be front-run'}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )

  const popoverContent = (
    <PopoverPrimitive.Content
      align="end"
      sideOffset={8}
      className={cn(
        'z-50 w-64 rounded-xl border border-border bg-popover shadow-md',
        'focus:outline-none'
      )}
    >
      <div className="px-4 pt-3 pb-0">
        <p className="text-sm font-semibold">Max Slippage</p>
      </div>
      {configContent}
      <PopoverPrimitive.Arrow className="fill-border" />
    </PopoverPrimitive.Content>
  )

  // ── Compact mode (header gear icon) ─────────────────────────────────────────
  if (compact) {
    const compactTrigger = (
      <button
        type="button"
        aria-label={`Slippage: ${displayValue}. Click to configure.`}
        className={cn(
          'flex items-center gap-1 rounded-md px-2 py-1',
          'text-xs text-muted-foreground',
          'hover:bg-accent hover:text-foreground transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
      >
        <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
        {!isAutoSlippage && (
          <span className="font-medium text-foreground">{value}%</span>
        )}
      </button>
    )

    if (isMobile) {
      return (
        <>
          <button
            type="button"
            aria-label={`Slippage: ${displayValue}. Click to configure.`}
            onClick={() => setOpen(true)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1',
              'text-xs text-muted-foreground',
              'hover:bg-accent hover:text-foreground transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              className
            )}
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            {!isAutoSlippage && (
              <span className="font-medium text-foreground">{value}%</span>
            )}
          </button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent asBottomSheet>
              <DialogHeader>
                <DialogTitle>Max Slippage</DialogTitle>
                <DialogCloseButton />
              </DialogHeader>
              {configContent}
            </DialogContent>
          </Dialog>
        </>
      )
    }

    return (
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          {compactTrigger}
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          {popoverContent}
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    )
  }

  // ── Card mode (full-width row in widget body) ────────────────────────────────

  // Card-style trigger row
  const triggerRow = (
    <button
      type="button"
      aria-label={`Configure slippage tolerance. Currently ${displayValue}`}
      className={cn(
        'flex w-full items-center justify-between gap-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg'
      )}
    >
      {/* Left: label + tooltip */}
      <TooltipProvider>
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <span>Max Slippage</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                role="img"
                aria-label="Slippage info"
                className="cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">
              If the price exceeds the maximum slippage percentage, the transaction will revert.
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Right: current value + badge */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{displayValue}</span>
        {isAutoSlippage && (
          <span className="text-[10px] font-medium text-muted-foreground border border-border rounded px-1.5 py-0.5">
            Auto
          </span>
        )}
      </div>
    </button>
  )

  // Mobile: trigger opens Dialog
  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            'rounded-2xl border bg-card px-4 py-3',
            className
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full"
            aria-label={`Configure slippage tolerance. Currently ${displayValue}`}
          >
            {triggerRow}
          </button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent asBottomSheet>
            <DialogHeader>
              <DialogTitle>Max Slippage</DialogTitle>
              <DialogCloseButton />
            </DialogHeader>
            {configContent}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Desktop: trigger opens Popover
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <div
          className={cn(
            'rounded-2xl border bg-card px-4 py-3 cursor-pointer',
            'hover:border-ring/40 transition-colors duration-150',
            className
          )}
        >
          {triggerRow}
        </div>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        {popoverContent}
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
