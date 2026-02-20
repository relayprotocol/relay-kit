import * as DialogPrimitive from '@radix-ui/react-dialog'
import type {
  ComponentPropsWithoutRef,
  ElementRef,
  FC,
  PropsWithChildren,
  ReactNode
} from 'react'
import { forwardRef, useState } from 'react'
import { useMediaQuery } from 'usehooks-ts'
import { cn } from '../../utils/cn.js'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

const Overlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> &
    PropsWithChildren & { className?: string }
>(({ children, className, ...props }, forwardedRef) => {
  return (
    <DialogPrimitive.Overlay
      ref={forwardedRef}
      {...props}
      className={cn('relay-fixed relay-inset-0', className, 'relay-kit-reset')}
    >
      {children}
    </DialogPrimitive.Overlay>
  )
})

const contentBase = [
  'relay-bg-[var(--relay-colors-modal-background)]',
  'relay-rounded-modal',
  'relay-border-modal',
  'relay-fixed relay-left-1/2',
  'relay-min-w-[90vw] relay-max-w-[100vw]',
  'sm:relay-min-w-[400px] sm:relay-max-w-[532px]',
  'relay-max-h-[85vh] relay-overflow-y-auto',
  'focus:relay-outline-none'
].join(' ')

const Content = forwardRef<
  ElementRef<typeof DialogPrimitive.DialogContent>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.DialogContent> &
    PropsWithChildren
>(({ children, ...props }, forwardedRef) => {
  return (
    <DialogPrimitive.DialogContent
      ref={forwardedRef}
      {...props}
      className={cn(contentBase, 'relay-top-full')}
    >
      {children}
    </DialogPrimitive.DialogContent>
  )
})

const AnimatedContent = forwardRef<
  ElementRef<typeof DialogPrimitive.DialogContent>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.DialogContent> &
    PropsWithChildren & { className?: string; disableAnimation?: boolean }
>(({ children, className, disableAnimation = false, ...props }, forwardedRef) => {
  const isMobile = useMediaQuery('(max-width: 520px)')
  const isMobileSlideUp = isMobile && !disableAnimation

  const mobileClasses = [
    'relay-bottom-0 relay-top-auto relay-left-0',
    'relay-translate-x-0',
    'relay-animate-dialog-slide-up',
    'data-[state=closed]:relay-animate-dialog-slide-down',
    'max-[520px]:relay-rounded-b-none max-[520px]:relay-w-full'
  ].join(' ')

  const desktopClasses = [
    'relay-top-1/2 -relay-translate-x-1/2 -relay-translate-y-1/2',
    'relay-animate-dialog-fade-in',
    'data-[state=closed]:relay-animate-dialog-fade-out'
  ].join(' ')

  return (
    <DialogPrimitive.DialogContent
      ref={forwardedRef}
      className={cn(
        contentBase,
        isMobileSlideUp ? mobileClasses : desktopClasses,
        className
      )}
      {...props}
    >
      <VisuallyHidden>
        <DialogPrimitive.Title>Title</DialogPrimitive.Title>
      </VisuallyHidden>
      {children}
    </DialogPrimitive.DialogContent>
  )
})

AnimatedContent.displayName = 'AnimatedContent'

type Props = {
  trigger: ReactNode
  portalProps?: DialogPrimitive.DialogPortalProps
}

const Dialog = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & Props
>(({ children, trigger, portalProps, ...props }, forwardedRef) => {
  const [open, setOpen] = useState(false)

  return (
    <DialogPrimitive.Root onOpenChange={setOpen} open={open}>
      <DialogPrimitive.DialogTrigger asChild>
        {trigger}
      </DialogPrimitive.DialogTrigger>
      {open ? (
        <DialogPrimitive.DialogPortal {...portalProps}>
          <AnimatedContent ref={forwardedRef} {...props}>
            {children}
          </AnimatedContent>
        </DialogPrimitive.DialogPortal>
      ) : null}
    </DialogPrimitive.Root>
  )
})

Dialog.displayName = 'Dialog'

export { Dialog, Content, AnimatedContent, Overlay }
