import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  forwardRef,
  type ReactNode,
  useState
} from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import {
  cva,
  css as designCss,
  type Styles
} from '@relayprotocol/relay-design-system/css'

const DropdownMenuContentCss = cva({
  base: {
    mx: '4',
    p: '3',
    borderRadius: 8,
    zIndex: 5,
    background: 'modal-background',
    boxShadow: '0px 0px 50px 0px #0000001F',
    border: 'dropdown-border'
  }
})

const DropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.DropdownMenuContent>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.DropdownMenuContent> & {
    css?: Styles
  }
>(({ children, css, ...props }, forwardedRef) => {
  return (
    <DropdownMenuPrimitive.DropdownMenuContent
      {...props}
      ref={forwardedRef}
      className={designCss(DropdownMenuContentCss.raw(), designCss.raw(css))}
    >
      {children}
    </DropdownMenuPrimitive.DropdownMenuContent>
  )
})

const DropdownMenuItemCss = cva({
  base: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 16,
    color: 'text-default',
    background: 'modal-background',
    p: '3',
    outline: 'none',
    cursor: 'pointer',
    transition: 'backdrop-filter 250ms linear',
    _hover: {
      backdropFilter: 'brightness(95%)',
      backgroundColor: 'gray/10'
    },
    '&:focus': {
      backdropFilter: 'brightness(95%)',
      backgroundColor: 'gray/10'
    }
  }
})

const DropdownMenuItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.DropdownMenuItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.DropdownMenuItem> & {
    css?: Styles
  }
>(({ children, css, ...props }, forwardedRef) => {
  return (
    <DropdownMenuPrimitive.DropdownMenuItem
      {...props}
      ref={forwardedRef}
      className={designCss(DropdownMenuItemCss.raw(), designCss.raw(css))}
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
