import type { ComponentPropsWithoutRef, FC, ReactNode } from 'react'
import { AnimatedContent, Overlay } from '../primitives/Dialog.js'
import {
  Root as DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogClose
} from '@radix-ui/react-dialog'
import { Button } from '../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons/faXmark'
import type { SystemStyleObject } from '@relayprotocol/relay-design-system/types'
import { AnimatePresence } from 'framer-motion'

type ModalProps = {
  trigger?: ReactNode
  css?: SystemStyleObject
  overlayZIndex?: number
  showCloseButton?: boolean
  disableAnimation?: boolean
  onCloseButtonClicked?: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void
  children: ReactNode
}

export const Modal: FC<
  ComponentPropsWithoutRef<typeof DialogRoot> &
    ModalProps &
    Pick<
      ComponentPropsWithoutRef<typeof AnimatedContent>,
      'onPointerDownOutside' | 'onOpenAutoFocus'
    >
> = ({
  trigger,
  css,
  overlayZIndex = 9999,
  showCloseButton = true,
  disableAnimation = false,
  children,
  ...props
}) => {
  return (
    <DialogRoot modal={true} {...props}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <AnimatePresence>
        {props.open ? (
          <DialogPortal forceMount>
            <Overlay
              forceMount
              css={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'blackA10'
              }}
              style={{ zIndex: overlayZIndex }}
            >
              <AnimatedContent
                forceMount
                css={{
                  '--borderColor': 'colors.subtle-border-color',
                  border: '1px solid var(--borderColor)',
                  padding: '4',
                  ...css
                }}
                disableAnimation={disableAnimation}
                onPointerDownOutside={props.onPointerDownOutside}
                onOpenAutoFocus={props.onOpenAutoFocus}
              >
                {showCloseButton ? (
                  <DialogClose
                    asChild
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 12,
                      zIndex: 10
                    }}
                  >
                    <Button
                      color="ghost"
                      size="none"
                      css={{ color: 'gray9', p: '2' }}
                      onClick={(e) => {
                        props.onCloseButtonClicked?.(e)
                      }}
                    >
                      <FontAwesomeIcon icon={faXmark} width={16} height={16} />
                    </Button>
                  </DialogClose>
                ) : null}
                {children}
              </AnimatedContent>
            </Overlay>
          </DialogPortal>
        ) : null}
      </AnimatePresence>
    </DialogRoot>
  )
}
