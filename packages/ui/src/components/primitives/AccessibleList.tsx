import React, { forwardRef, type FC } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { cn } from '../../utils/cn.js'

type AccessibleListProps = {
  children: React.ReactNode
  onSelect: (value: string) => void
  className?: string
}

export const AccessibleList: FC<AccessibleListProps> = ({
  children,
  onSelect,
  className
}) => {
  return (
    <ToggleGroup.Root
      type="single"
      loop={false}
      onValueChange={onSelect}
      className={cn('relay-flex relay-flex-col', className)}
    >
      {children}
    </ToggleGroup.Root>
  )
}

type AccessibleListItemProps = {
  children: React.ReactNode
  value: string
  className?: string
  asChild?: boolean
}

export const AccessibleListItem = forwardRef<
  HTMLButtonElement,
  AccessibleListItemProps
>(({ children, value, className, asChild, ...props }, forwardedRef) => {
  return (
    <ToggleGroup.Item
      value={value}
      className={cn(
        'relay-flex relay-items-center relay-relative relay-select-none relay-cursor-pointer',
        className
      )}
      asChild={asChild}
      {...props}
      ref={forwardedRef}
    >
      {children}
    </ToggleGroup.Item>
  )
})

AccessibleListItem.displayName = 'AccessibleListItem'
