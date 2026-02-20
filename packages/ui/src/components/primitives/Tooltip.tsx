import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as Popover from '@radix-ui/react-popover'
import { useMediaQuery } from 'usehooks-ts'
import { cn } from '../../utils/cn.js'

const Tooltip = ({
  children,
  content,
  open,
  defaultOpen,
  onOpenChange,
  asChild = false,
  ...props
}: any) => {
  const isSmallDevice = useMediaQuery('(max-width: 600px)')

  if (isSmallDevice) {
    return (
      <Popover.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
      >
        <Popover.Trigger asChild={asChild}>{children}</Popover.Trigger>
        <Popover.Content
          sideOffset={2}
          side="bottom"
          align="center"
          style={{ zIndex: 10000003, outline: 'none', maxWidth: '100vw' }}
          {...props}
        >
          <Popover.Arrow className="relay-fill-[var(--relay-colors-modal-background)]" />
          <div
            className="relay-z-[10000004] relay-shadow-[0px_1px_5px_rgba(0,0,0,0.2)] relay-rounded-[8px] relay-overflow-hidden"
          >
            <div className="relay-bg-[var(--relay-colors-modal-background)] relay-p-2">
              {content}
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
    )
  }
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        delayDuration={250}
      >
        <TooltipPrimitive.Trigger asChild={asChild}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Content
          sideOffset={2}
          side="bottom"
          align="center"
          style={{ zIndex: 10000003 }}
          {...props}
        >
          <div className="relay-fill-[var(--relay-colors-modal-background)]" />
          <div
            className="relay-z-[10000004] relay-shadow-[0px_1px_5px_rgba(0,0,0,0.2)] relay-rounded-[8px] relay-overflow-hidden"
          >
            <div className="relay-bg-[var(--relay-colors-modal-background)] relay-p-2">
              {content}
            </div>
          </div>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export default Tooltip
