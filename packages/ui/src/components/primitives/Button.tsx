import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn.js'

const buttonVariants = cva(
  [
    'relay:cursor-pointer relay:outline-none relay:font-body relay:font-bold relay:text-[16px]',
    'relay:transition-all relay:duration-200 relay:ease-out relay:select-none',
    'relay:gap-2 relay:inline-flex relay:items-center relay:leading-[20px]',
    'relay:focus-visible:ring-2 relay:focus-visible:ring-[var(--relay-colors-focus-color)] relay:focus-visible:ring-offset-2',
    'relay:active:scale-[0.98]',
    'relay:disabled:cursor-not-allowed relay:disabled:bg-[var(--relay-colors-button-disabled-background)] relay:disabled:text-[color:var(--relay-colors-button-disabled-color)]',
    'relay:disabled:hover:bg-[var(--relay-colors-button-disabled-background)] relay:disabled:hover:text-[color:var(--relay-colors-button-disabled-color)]',
    'relay:disabled:active:scale-100'
  ].join(' '),
  {
    variants: {
      color: {
        primary: [
          'relay:bg-[var(--relay-colors-primary-button-background)]',
          'relay:text-[color:var(--relay-colors-primary-button-color)]',
          'relay:hover:bg-[var(--relay-colors-primary-button-hover-background)]',
          'relay:hover:text-[color:var(--relay-colors-primary-button-hover-color)]'
        ].join(' '),
        secondary: [
          'relay:bg-[var(--relay-colors-primary4)]',
          'relay:text-[color:var(--relay-colors-primary12)]',
          'relay:hover:bg-[var(--relay-colors-secondary-button-hover-background)]',
          'relay:hover:text-[color:var(--relay-colors-secondary-button-hover-color)]'
        ].join(' '),
        ghost: 'relay:bg-transparent',
        white: [
          'relay:bg-[var(--relay-colors-widget-background)]',
          'relay:transition-[filter] relay:duration-[250ms] relay:ease-linear',
          'relay:hover:brightness-[0.97]',
          'relay:border relay:border-solid relay:border-[var(--relay-colors-subtle-border-color)]'
        ].join(' '),
        error: [
          'relay:bg-[var(--relay-colors-red9)] relay:text-white',
          'relay:hover:bg-[var(--relay-colors-red10)]'
        ].join(' '),
        warning: [
          'relay:bg-[var(--relay-colors-amber3)]',
          'relay:text-[color:var(--relay-colors-amber11)]',
          'relay:hover:bg-[var(--relay-colors-amber4)]',
          'relay:hover:text-[color:var(--relay-colors-amber11)]'
        ].join(' '),
        grey: [
          'relay:bg-[var(--relay-colors-gray3)]',
          'relay:text-[color:var(--relay-colors-gray11)]',
          'relay:hover:bg-[var(--relay-colors-gray4)]'
        ].join(' ')
      },
      corners: {
        square: 'relay:rounded-none',
        rounded: 'relay:rounded-[var(--relay-radii-button-border-radius)]',
        pill: 'relay:rounded-full',
        circle: 'relay:rounded-full relay:items-center relay:justify-center'
      },
      size: {
        none: '',
        xs: 'relay:p-3 relay:leading-[16px] relay:min-h-[40px]',
        small: 'relay:px-3 relay:py-2 relay:leading-[12px] relay:min-h-[40px]',
        medium: 'relay:px-5 relay:py-3 relay:min-h-[44px]',
        large: 'relay:px-5 relay:py-4 relay:min-h-[52px]'
      },
      cta: {
        true: [
          'relay:[&:not(:disabled)]:font-heading',
          'relay:[&:not(:disabled)]:font-bold',
          'relay:[&:not(:disabled)]:uppercase',
          'relay:cta-font-style'
        ].join(' ')
      }
    },
    defaultVariants: {
      color: 'primary',
      corners: 'rounded',
      size: 'medium'
    }
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>

const Button = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'ref' | 'color' | 'style'> &
    ButtonVariantProps & { className?: string; style?: React.CSSProperties }
>(({ className, children, style, ...props }, forwardedRef) => {
  const { color, size, corners, cta, ...buttonProps } = { ...props }
  return (
    <button
      {...buttonProps}
      ref={forwardedRef}
      className={cn(
        buttonVariants({ color, size, corners, cta }),
        className
      )}
      style={style}
    >
      {children}
    </button>
  )
})

export default Button
