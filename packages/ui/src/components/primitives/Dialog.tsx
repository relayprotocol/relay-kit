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
      className={cn(
        'relay:fixed relay:inset-0 relay:bg-black/50 relay:backdrop-blur-sm',
        'relay:animate-overlay-fade-in relay:data-[state=closed]:animate-overlay-fade-out',
        className,
        'relay-kit-reset'
      )}
    >
      {children}
    </DialogPrimitive.Overlay>
  )
})

const contentBase = [
  'relay:bg-[var(--relay-colors-modal-background)]',
  'relay:rounded-[var(--relay-radii-modal-border-radius)]',
  'relay:border-modal',
  'relay:shadow-xl',
  'relay:fixed',
  'relay:max-h-[85vh] relay:overflow-y-auto',
  'relay:focus:outline-none'
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
      className={cn(contentBase, 'relay:top-full')}
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
  const isMobileFullScreen = isMobile && disableAnimation

  const mobileSlideUpClasses = [
    'relay:bottom-0 relay:top-auto relay:left-0 relay:w-full',
    'relay:animate-dialog-slide-up',
    'relay:data-[state=closed]:animate-dialog-slide-down',
    'relay:max-[520px]:rounded-b-none'
  ].join(' ')

  const mobileFullScreenClasses = [
    'relay:top-0 relay:left-0 relay:w-full relay:h-full',
    'relay:max-h-full relay:rounded-none'
  ].join(' ')

  const desktopClasses = [
    'relay:left-1/2 relay:top-1/2',
    'relay:min-w-[90vw] relay:max-w-[100vw]',
    'relay:sm:min-w-[400px] relay:sm:max-w-[532px]',
    'relay:animate-scale-in',
    'relay:data-[state=closed]:animate-scale-out'
  ].join(' ')

  return (
    <DialogPrimitive.DialogContent
      ref={forwardedRef}
      className={cn(
        contentBase,
        isMobileFullScreen
          ? mobileFullScreenClasses
          : isMobileSlideUp
            ? mobileSlideUpClasses
            : desktopClasses,
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
