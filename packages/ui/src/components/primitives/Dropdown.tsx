import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  forwardRef,
  type ReactNode,
  useState
} from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '../../utils/cn.js'

const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.DropdownMenuContent>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.DropdownMenuContent> & {
    className?: string
  }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <DropdownMenuPrimitive.DropdownMenuContent
      {...props}
      ref={forwardedRef}
      className={cn(
        'relay-mx-4 relay-p-3 relay-rounded-[8px] relay-z-[10000002]',
        'relay-bg-[var(--relay-colors-modal-background)]',
        'relay-shadow-[0px_0px_50px_0px_#0000001F]',
        'relay-border-dropdown',
        className
      )}
    >
      {children}
    </DropdownMenuPrimitive.DropdownMenuContent>
  )
})

const DropdownMenuItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.DropdownMenuItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.DropdownMenuItem> & {
    className?: string
  }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <DropdownMenuPrimitive.DropdownMenuItem
      {...props}
      ref={forwardedRef}
      className={cn(
        'relay-flex relay-items-center relay-text-[16px]',
        'relay-text-[color:var(--relay-colors-text-default)]',
        'relay-bg-[var(--relay-colors-modal-background)]',
        'relay-p-3 relay-outline-none relay-cursor-pointer',
        'relay-transition-[background-color] relay-duration-150 relay-ease-linear',
        'hover:relay-bg-[var(--relay-colors-gray-10)]/10',
        'focus:relay-bg-[var(--relay-colors-gray-10)]/10',
        className
      )}
    >
      {children}
    </DropdownMenuPrimitive.DropdownMenuItem>
  )
})

type Props = {
  trigger: ReactNode
  contentProps?: ComponentPropsWithoutRef<typeof DropdownMenuContent>
}

const Dropdown = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root> & Props
>(({ children, trigger, contentProps, ...props }, forwardedRef) => {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenuPrimitive.Root
      {...props}
      open={props.open ?? open}
      onOpenChange={props.onOpenChange ?? setOpen}
    >
      <DropdownMenuPrimitive.Trigger asChild>
        {trigger}
      </DropdownMenuPrimitive.Trigger>
      {(props.open || open) && (
        <DropdownMenuContent ref={forwardedRef} {...contentProps}>
          {children}
        </DropdownMenuContent>
      )}
    </DropdownMenuPrimitive.Root>
  )
})

Dropdown.displayName = 'Dropdown'

export { Dropdown, DropdownMenuContent, DropdownMenuItem }
