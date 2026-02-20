import * as Collapsible from '@radix-ui/react-collapsible'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type PropsWithChildren
} from 'react'
import { cn } from '../../utils/cn.js'

const CollapsibleContent = forwardRef<
  ElementRef<typeof Collapsible.CollapsibleContent>,
  ComponentPropsWithoutRef<typeof Collapsible.CollapsibleContent> &
    PropsWithChildren & { className?: string }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <Collapsible.CollapsibleContent
      ref={forwardedRef}
      {...props}
      className={cn(
        'relay-overflow-hidden',
        'data-[state=open]:relay-animate-collapsible-down',
        'data-[state=closed]:relay-animate-collapsible-up',
        className
      )}
    >
      {children}
    </Collapsible.CollapsibleContent>
  )
})

const CollapsibleRoot = forwardRef<
  ElementRef<typeof Collapsible.Root>,
  ComponentPropsWithoutRef<typeof Collapsible.Root> &
    PropsWithChildren & { className?: string }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <Collapsible.Root
      ref={forwardedRef}
      {...props}
      className={cn('relay-w-full', className)}
    >
      {children}
    </Collapsible.Root>
  )
})

const CollapsibleTrigger = forwardRef<
  ElementRef<typeof Collapsible.Trigger>,
  ComponentPropsWithoutRef<typeof Collapsible.Trigger> &
    PropsWithChildren & { className?: string }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <Collapsible.Trigger
      ref={forwardedRef}
      {...props}
      className={cn(
        'relay-w-full relay-flex relay-items-center relay-justify-between relay-cursor-pointer',
        className
      )}
    >
      {children}
    </Collapsible.Trigger>
  )
})

export { CollapsibleRoot, CollapsibleContent, CollapsibleTrigger }
