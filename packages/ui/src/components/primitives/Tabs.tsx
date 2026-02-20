import * as TabsPrimitive from '@radix-ui/react-tabs'
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef
} from 'react'
import { cn } from '../../utils/cn.js'

const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    className?: string
  }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <TabsPrimitive.List
      {...props}
      ref={forwardedRef}
      className={cn(
        'relay-flex relay-items-center relay-rounded-[8px] relay-p-1',
        'relay-bg-[var(--relay-colors-gray2)] relay-border-none',
        className
      )}
    >
      {children}
    </TabsPrimitive.List>
  )
})

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    className?: string
  }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <TabsPrimitive.Trigger
      {...props}
      ref={forwardedRef}
      className={cn(
        'relay-w-full relay-font-medium relay-text-[14px] relay-cursor-pointer',
        'relay-py-[2px] relay-text-[color:var(--relay-colors-gray12)]',
        'relay-rounded-[8px] relay-bg-transparent',
        'relay-border relay-border-solid relay-border-transparent',
        'data-[state=active]:relay-bg-[var(--relay-colors-subtle-background-color)]',
        'data-[state=active]:relay-border-[var(--relay-colors-gray-5)]',
        className
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  )
})

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & {
    className?: string
  }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <TabsPrimitive.Content
      {...props}
      ref={forwardedRef}
      className={cn(className)}
    >
      {children}
    </TabsPrimitive.Content>
  )
})

const TabsRoot = forwardRef<
  ElementRef<typeof TabsPrimitive.Root>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
    className?: string
  }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <TabsPrimitive.Root
      {...props}
      ref={forwardedRef}
      className={cn(className)}
    >
      {children}
    </TabsPrimitive.Root>
  )
})

export { TabsRoot, TabsList, TabsTrigger, TabsContent }
