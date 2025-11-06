import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import type {
  ComponentPropsWithoutRef,
  ElementRef,
  FC,
  PropsWithChildren,
  ReactNode
} from 'react'
import { forwardRef, useState } from 'react'
import { useMediaQuery } from 'usehooks-ts'
import {
  cva,
  css as designCss,
  type Styles
} from '@relayprotocol/relay-design-system/css'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

const OverlayStyle = cva({
  base: {
    position: 'fixed',
    inset: 0
  }
})

const Overlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> &
    PropsWithChildren & { css?: Styles }
>(({ children, css, ...props }, forwardedRef) => {
  return (
    <DialogPrimitive.Overlay
      ref={forwardedRef}
      {...props}
      className={`${designCss(
        OverlayStyle.raw(),
        designCss.raw(css)
      )} relay-kit-reset`}
    >
      {children}
    </DialogPrimitive.Overlay>
  )
})

const ContentCss = cva({
  base: {
    backgroundColor: 'modal-background',
    borderRadius: 'modal-border-radius',
    border: 'modal-border',
    position: 'fixed',
    left: '50%',
    top: '100%',
    minWidth: '90vw',
    maxWidth: '100vw',
    sm: {
      minWidth: '400px',
      maxWidth: '532px'
    },
    maxHeight: '85vh',
    overflowY: 'auto',
    _focus: { outline: 'none' },
    '@media(max-width: 520px)': {
      borderBottomRightRadius: 0,
      borderBottomLeftRadius: 0,
      width: '100%'
    }
  }
})

const Content = forwardRef<
  ElementRef<typeof DialogPrimitive.DialogContent>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.DialogContent> &
    PropsWithChildren
>(({ children, ...props }, forwardedRef) => {
  return (
    <DialogPrimitive.DialogContent
      ref={forwardedRef}
      {...props}
      className={ContentCss()}
    >
      {children}
    </DialogPrimitive.DialogContent>
  )
})

const AnimatedContent = forwardRef<
  ElementRef<typeof DialogPrimitive.DialogContent>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.DialogContent> &
    PropsWithChildren & { css?: Styles; disableAnimation?: boolean }
>(({ children, css, disableAnimation = false, ...props }, forwardedRef) => {
  const isMobile = useMediaQuery('(max-width: 520px)')
  const isMobileSlideUpEnabled = isMobile && !disableAnimation

  const animation = isMobileSlideUpEnabled
    ? {
        initial: {
          opacity: 0,
          bottom: '-100%',
          top: 'auto',
          left: 0
        },
        animate: {
          opacity: 1,
          bottom: 0,
          top: 'auto',
          left: 0
        },
        exit: {
          opacity: 0,
          bottom: '-100%',
          top: 'auto',
          left: 0
        }
      }
    : {
        initial: {
          opacity: 0,
          top: '50%',
          transform: 'translateX(-50%) translateY(-50%)'
        },
        animate: {
          opacity: 1,
          top: '50%',
          transform: 'translateX(-50%) translateY(-50%)'
        },
        exit: {
          opacity: 0,
          top: '50%',
          transform: 'translateX(-50%) translateY(-50%)'
        }
      }
  return (
    <DialogPrimitive.DialogContent
      className={designCss(ContentCss.raw(props), designCss.raw(css))}
      forceMount
      asChild
      {...props}
    >
      <motion.div
        key={isMobile + 'modal'}
        ref={forwardedRef}
        transition={{
          type: isMobileSlideUpEnabled ? 'tween' : undefined,
          duration: isMobileSlideUpEnabled ? 0.2 : 0.1,
          ease: isMobileSlideUpEnabled ? undefined : 'linear'
        }}
        {...animation}
      >
        <VisuallyHidden>
          <DialogPrimitive.Title>Title</DialogPrimitive.Title>
        </VisuallyHidden>
        {children}
      </motion.div>
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
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.DialogPortal forceMount {...portalProps}>
            <AnimatedContent ref={forwardedRef} forceMount {...props}>
              {children}
            </AnimatedContent>
          </DialogPrimitive.DialogPortal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
})

Dialog.displayName = 'Dialog'

export { Dialog, Content, AnimatedContent, Overlay }
