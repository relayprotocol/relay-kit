import React, { forwardRef } from 'react'
import type { HTMLProps, PropsWithChildren, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn.js'

const inputVariants = cva(
  [
    'relay-px-4 relay-py-3 relay-rounded-input relay-font-body relay-text-[16px]',
    'relay-text-[color:var(--relay-colors-input-color)]',
    'relay-bg-[var(--relay-colors-input-background)]',
    'placeholder:relay-text-[color:var(--relay-colors-gray10)]',
    'focus:relay-shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)] focus:relay-outline-none',
    'disabled:relay-cursor-not-allowed',
    '[&::-webkit-outer-spin-button]:relay-appearance-none [&::-webkit-inner-spin-button]:relay-appearance-none'
  ].join(' '),
  {
    variants: {
      size: {
        large: 'relay-text-[32px] relay-leading-[42px]'
      },
      ellipsify: {
        true: 'relay-text-ellipsis relay-overflow-hidden relay-whitespace-nowrap'
      }
    }
  }
)

type InputVariants = VariantProps<typeof inputVariants>

const Input = forwardRef<
  HTMLInputElement,
  Omit<HTMLProps<HTMLInputElement>, 'size'> &
    PropsWithChildren & {
      icon?: ReactNode
      iconPosition?: 'left' | 'right'
      iconClassName?: string
      containerClassName?: string
      inputStyle?: React.CSSProperties
    } & { className?: string } & InputVariants
>(
  (
    {
      children,
      icon,
      iconPosition,
      iconClassName,
      containerClassName,
      inputStyle,
      className,
      ...props
    },
    ref
  ) => {
    const { size, ellipsify, style, ...inputProps } = props

    return (
      <div className={cn('relay-flex', containerClassName)} style={style}>
        {icon && (
          <div className="relay-flex relay-relative">
            <div
              className={cn(
                'relay-absolute relay-top-[12px] relay-z-0',
                iconPosition === 'right'
                  ? 'relay-right-4 relay-left-[unset]'
                  : 'relay-left-4 relay-right-[unset]',
                iconClassName
              )}
            >
              {icon}
            </div>
          </div>
        )}
        <input
          {...inputProps}
          type="text"
          ref={ref}
          style={{
            paddingLeft: icon && iconPosition !== 'right' ? 42 : 16,
            paddingRight: icon && iconPosition === 'right' ? 42 : 16,
            ...inputStyle
          }}
          className={cn(inputVariants({ size, ellipsify }), className)}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
