import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils.js'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

/**
 * Full-screen overlay behind the dialog content.
 * Fades in/out using Tailwind's data-[state=...] variant.
 */
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80',
      'data-[state=open]:motion-safe:animate-fade-in',
      'data-[state=closed]:motion-safe:animate-fade-out',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * Dialog content panel. Scales in when open, fades out when closed.
 * On mobile, renders as a bottom sheet. On sm+, renders as a centered modal.
 *
 * When asBottomSheet is true, uses `.relay-bottom-sheet` CSS class which
 * handles positioning + animation via @media queries (not Tailwind responsive
 * prefixes). This avoids the "starts at bottom then snaps to center" glitch.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** When true, renders as a bottom sheet on mobile / centered modal on desktop */
    asBottomSheet?: boolean
  }
>(({ className, children, asBottomSheet, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 focus:outline-none',
        asBottomSheet
          ? 'relay-bottom-sheet'
          : [
              // Centered modal — position + animation via CSS class (avoids Tailwind
              // transform variable conflict that causes "snap from corner" glitch)
              'relay-centered-modal',
              'bg-background shadow-lg rounded-xl max-w-lg w-full',
            ],
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

/**
 * Standard dialog header container with flex column layout.
 */
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 p-6 pb-0', className)}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

/**
 * Standard dialog footer container with flex row layout.
 */
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-0', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

/**
 * Dialog title. Always render this (even if visually hidden) for accessibility.
 * Screen readers announce this when the dialog opens.
 */
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

/**
 * Optional dialog description text. Linked to the dialog via aria-describedby automatically.
 */
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

/**
 * Pre-built close button with X icon. Place in the dialog header.
 */
const DialogCloseButton = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Close
    ref={ref}
    className={cn(
      'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity',
      'hover:opacity-100',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      'disabled:pointer-events-none',
      className
    )}
    aria-label="Close"
    {...props}
  >
    <X className="h-4 w-4" aria-hidden="true" />
  </DialogPrimitive.Close>
))
DialogCloseButton.displayName = 'DialogCloseButton'

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogCloseButton
}
