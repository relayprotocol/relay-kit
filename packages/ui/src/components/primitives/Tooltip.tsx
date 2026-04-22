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
          <div
            className="relay:z-[10000004] relay:shadow-[0_2px_12px_rgba(0,0,0,0.12)] relay:rounded-[8px] relay:overflow-hidden relay:border-modal"
          >
            <div className="relay:bg-[var(--relay-colors-modal-background)] relay:p-2">
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
          className="relay:animate-content-fade-in"
          {...props}
        >
          <div
            className="relay:z-[10000004] relay:shadow-[0_2px_12px_rgba(0,0,0,0.12)] relay:rounded-[8px] relay:overflow-hidden relay:border-modal"
          >
            <div className="relay:bg-[var(--relay-colors-modal-background)] relay:p-2">
              {content}
            </div>
          </div>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export default Tooltip
