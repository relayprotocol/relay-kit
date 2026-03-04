import React, { forwardRef } from 'react'
import type { HTMLProps, PropsWithChildren, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn.js'

const inputVariants = cva(
  [
    'relay:w-full relay:px-4 relay:py-3 relay:rounded-input relay:font-body relay:text-[16px] relay:cursor-text',
    'relay:text-[color:var(--relay-colors-input-color)]',
    'relay:bg-[var(--relay-colors-input-background)]',
    'relay:placeholder:text-[color:var(--relay-colors-gray9)] relay:placeholder-ellipsis',
    'relay:transition-shadow relay:duration-200',
    'relay:focus:shadow-[inset_0_0_0_2px_var(--relay-colors-focus-color)] relay:focus:outline-none',
    'relay:disabled:cursor-not-allowed',
    'relay:[&::-webkit-outer-spin-button]:appearance-none relay:[&::-webkit-inner-spin-button]:appearance-none'
  ].join(' '),
  {
    variants: {
      size: {
        large: 'relay:text-[32px] relay:leading-[42px]'
      },
      ellipsify: {
        true: 'relay:text-ellipsis relay:overflow-hidden relay:whitespace-nowrap'
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
      <div className={cn('relay:flex relay:w-full', containerClassName)} style={style}>
        {icon && (
          <div className="relay:flex relay:relative">
            <div
              className={cn(
                'relay:absolute relay:top-[12px] relay:z-10 relay:flex relay:items-center',
                iconPosition === 'right'
                  ? 'relay:right-4 relay:left-[unset]'
                  : 'relay:left-4 relay:right-[unset]',
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
