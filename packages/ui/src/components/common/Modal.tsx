import type { ComponentPropsWithoutRef, CSSProperties, FC, ReactNode } from 'react'
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

type ModalProps = {
  trigger?: ReactNode
  className?: string
  contentStyle?: CSSProperties
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
  className,
  contentStyle,
  overlayZIndex = 10000000,
  showCloseButton = true,
  disableAnimation = false,
  children,
  ...props
}) => {
  return (
    <DialogRoot modal={true} {...props}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {props.open ? (
        <DialogPortal forceMount>
          <Overlay
            forceMount
            className="relay-fixed relay-inset-0 relay-bg-[var(--relay-colors-blackA10)]"
            style={{ zIndex: overlayZIndex }}
          >
            <AnimatedContent
              forceMount
              className={`relay-border relay-border-solid relay-border-[var(--relay-colors-subtle-border-color)] relay-p-4 ${className ?? ''}`}
              style={contentStyle}
              disableAnimation={disableAnimation}
              onPointerDownOutside={props.onPointerDownOutside}
              onOpenAutoFocus={props.onOpenAutoFocus}
            >
              {showCloseButton ? (
                <DialogClose
                  asChild
                  className="relay-absolute relay-right-[10px] relay-top-[12px] relay-z-10"
                >
                  <Button
                    color="ghost"
                    size="none"
                    className="relay-text-[color:var(--relay-colors-gray9)] relay-p-2"
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
    </DialogRoot>
  )
}
