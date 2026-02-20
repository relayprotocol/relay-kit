import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn.js'

const buttonVariants = cva(
  [
    'relay-cursor-pointer relay-outline-none relay-font-body relay-font-bold relay-text-[16px]',
    'relay-transition-[background-color] relay-duration-[250ms] relay-ease-linear',
    'relay-gap-2 relay-inline-flex relay-items-center relay-leading-[20px]',
    'focus-visible:relay-shadow-[0_0_0_2px_var(--relay-colors-focus-color)]',
    'disabled:relay-cursor-not-allowed disabled:relay-bg-[var(--relay-colors-button-disabled-background)] disabled:relay-text-[color:var(--relay-colors-button-disabled-color)]',
    'disabled:hover:relay-bg-[var(--relay-colors-button-disabled-background)] disabled:hover:relay-text-[color:var(--relay-colors-button-disabled-color)]'
  ].join(' '),
  {
    variants: {
      color: {
        primary: [
          'relay-bg-[var(--relay-colors-primary-button-background)]',
          'relay-text-[color:var(--relay-colors-primary-button-color)]',
          'hover:relay-bg-[var(--relay-colors-primary-button-hover-background)]',
          'hover:relay-text-[color:var(--relay-colors-primary-button-hover-color)]'
        ].join(' '),
        secondary: [
          'relay-bg-[var(--relay-colors-primary4)]',
          'relay-text-[color:var(--relay-colors-primary12)]',
          'hover:relay-bg-[var(--relay-colors-secondary-button-hover-background)]',
          'hover:relay-text-[color:var(--relay-colors-secondary-button-hover-color)]'
        ].join(' '),
        ghost: 'relay-text-[color:var(--relay-colors-text-default)] relay-bg-transparent',
        white: [
          'relay-bg-[var(--relay-colors-widget-background)]',
          'relay-transition-[filter] relay-duration-[250ms] relay-ease-linear',
          'hover:relay-brightness-[0.97]',
          'relay-border relay-border-solid relay-border-[var(--relay-colors-subtle-border-color)]'
        ].join(' '),
        error: [
          'relay-bg-[var(--relay-colors-red9)] relay-text-white',
          'hover:relay-bg-[var(--relay-colors-red10)]'
        ].join(' '),
        warning: [
          'relay-bg-[var(--relay-colors-amber3)]',
          'relay-text-[color:var(--relay-colors-amber11)]',
          'hover:relay-bg-[var(--relay-colors-amber4)]',
          'hover:relay-text-[color:var(--relay-colors-amber11)]'
        ].join(' '),
        grey: [
          'relay-bg-[var(--relay-colors-gray3)]',
          'relay-text-[color:var(--relay-colors-gray11)]',
          'hover:relay-bg-[var(--relay-colors-gray4)]'
        ].join(' ')
      },
      corners: {
        square: 'relay-rounded-none',
        rounded: 'relay-rounded-[12px]',
        pill: 'relay-rounded-full',
        circle: 'relay-rounded-full relay-items-center relay-justify-center'
      },
      size: {
        none: '',
        xs: 'relay-p-3 relay-leading-[16px] relay-min-h-[40px]',
        small: 'relay-px-3 relay-py-2 relay-leading-[12px] relay-min-h-[40px]',
        medium: 'relay-px-5 relay-py-3 relay-min-h-[44px]',
        large: 'relay-px-5 relay-py-4 relay-min-h-[52px]'
      },
      cta: {
        true: [
          '[&:not(:disabled)]:relay-font-heading',
          '[&:not(:disabled)]:relay-font-bold',
          '[&:not(:disabled)]:relay-uppercase',
          '[&:not(:disabled)]:relay-italic'
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
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'ref' | 'color'> &
    ButtonVariantProps & { className?: string }
>(({ className, children, ...props }, forwardedRef) => {
  const { color, size, corners, cta, ...buttonProps } = { ...props }
  return (
    <button
      {...buttonProps}
      ref={forwardedRef}
      className={cn(
        buttonVariants({ color, size, corners, cta }),
        className
      )}
    >
      {children}
    </button>
  )
})

export default Button
