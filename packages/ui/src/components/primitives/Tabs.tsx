import * as TabsPrimitive from '@radix-ui/react-tabs'
import {
  cva,
  css as designCss,
  type Styles
} from '@relayprotocol/relay-design-system/css'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef
} from 'react'

const TabsListCss = cva({
  base: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: 8,
    p: '1',
    backgroundColor: 'transparent',
    border: 'none'
  }
})

const TabsTriggerCss = cva({
  base: {
    width: '100%',
    fontWeight: '500',
    fontSize: '14px',
    cursor: 'pointer',
    py: '2px',
    color: 'gray12',
    borderRadius: 8,
    backgroundColor: 'transparent',
    border: 'none',
    '&[data-state="active"]': {
      backgroundColor: 'subtle-background-color',
      '--borderColor': 'colors.gray.5',
      border: '1px solid var(--borderColor)'
    }
  }
})

const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    css?: Styles
  }
>(({ children, css, ...props }, forwardedRef) => {
  return (
    <TabsPrimitive.List
      {...props}
      ref={forwardedRef}
      className={designCss(TabsListCss.raw(), designCss.raw(css))}
    >
      {children}
    </TabsPrimitive.List>
  )
})

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    css?: Styles
  }
>(({ children, css, ...props }, forwardedRef) => {
  return (
    <TabsPrimitive.Trigger
      {...props}
      ref={forwardedRef}
      className={designCss(TabsTriggerCss.raw(), designCss.raw(css))}
    >
      {children}
    </TabsPrimitive.Trigger>
  )
})

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & {
    css?: Styles
  }
>(({ children, css, ...props }, forwardedRef) => {
  return (
    <TabsPrimitive.Content
      {...props}
      ref={forwardedRef}
      className={designCss(designCss.raw(css))}
    >
      {children}
    </TabsPrimitive.Content>
  )
})

const TabsRoot = forwardRef<
  ElementRef<typeof TabsPrimitive.Root>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
    css?: Styles
  }
>(({ children, css, ...props }, forwardedRef) => {
  return (
    <TabsPrimitive.Root
      {...props}
      ref={forwardedRef}
      className={designCss(designCss.raw(css))}
    >
      {children}
    </TabsPrimitive.Root>
  )
})

export { TabsRoot, TabsList, TabsTrigger, TabsContent }
