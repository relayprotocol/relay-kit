import * as Switch from '@radix-ui/react-switch'
import {
  type ElementRef,
  forwardRef,
  type ComponentPropsWithoutRef
} from 'react'
import { cn } from '../../utils/cn.js'

export const StyledSwitch = forwardRef<
  ElementRef<typeof Switch.Root>,
  ComponentPropsWithoutRef<typeof Switch.Root> & { className?: string }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <Switch.Root
      ref={forwardedRef}
      {...props}
      className={cn(
        'relay-cursor-pointer relay-w-[38px] relay-h-[20px]',
        'relay-bg-[var(--relay-colors-gray7)] relay-rounded-full',
        'relay-relative relay-flex relay-items-center relay-px-[10px]',
        'relay-transition-[background-color] relay-duration-[250ms]',
        "data-[state='checked']:relay-bg-[var(--relay-colors-primary-button-background)]",
        className
      )}
    >
      {children}
    </Switch.Root>
  )
})

export const StyledThumb = forwardRef<
  ElementRef<typeof Switch.Root>,
  ComponentPropsWithoutRef<typeof Switch.Root> & { className?: string }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <Switch.Thumb
      ref={forwardedRef}
      {...props}
      className={cn(
        'relay-block relay-w-[17.5px] relay-h-[17.5px]',
        'relay-bg-[var(--relay-colors-gray1)] relay-rounded-full',
        'relay-z-[1] relay-border relay-border-solid relay-border-[var(--relay-colors-gray-8)]',
        'relay-transition-transform relay-duration-100',
        'relay-translate-x-0 relay-will-change-transform',
        'relay-absolute relay-left-[2px]',
        "data-[state='checked']:relay-translate-x-[17px]",
        className
      )}
    />
  )
})
