import { cva, type VariantProps } from 'class-variance-authority'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, FC } from 'react'
import { cn } from '../../utils/cn.js'

const anchorVariants = cva(
  [
    'relay-cursor-pointer relay-w-max relay-font-medium relay-text-[14px]',
    'relay-text-[color:var(--relay-colors-anchor-color)]',
    'hover:relay-text-[color:var(--relay-colors-anchor-hover-color)]',
    'focus-visible:relay-shadow-[0_0_0_2px_var(--relay-colors-focus-color)] focus-visible:relay-outline-none focus-visible:relay-rounded-[4px]'
  ].join(' '),
  {
    variants: {
      color: {
        gray: 'relay-text-[color:var(--relay-colors-gray11)] hover:relay-text-[color:var(--relay-colors-gray12)]',
        base: 'relay-text-[color:var(--relay-colors-anchor-color)] hover:relay-text-[color:var(--relay-colors-anchor-hover-color)]',
        black: 'relay-text-[color:var(--relay-colors-gray12)] hover:relay-text-[color:var(--relay-colors-gray12)]'
      },
      weight: {
        heavy: 'relay-font-black',
        bold: 'relay-font-bold',
        semi_bold: 'relay-font-semibold'
      }
    }
  }
)

type AnchorVariantProps = VariantProps<typeof anchorVariants>

const Anchor: FC<
  AnchorHTMLAttributes<HTMLAnchorElement> & AnchorVariantProps & { className?: string }
> = ({ className, weight, color, ...props }) => {
  return (
    <a
      {...props}
      className={cn(anchorVariants({ weight, color }), className)}
    />
  )
}

export const AnchorButton: FC<
  ButtonHTMLAttributes<HTMLButtonElement> & AnchorVariantProps & { className?: string }
> = ({ className, weight, color, children, ...props }) => {
  return (
    <button
      {...props}
      className={cn(anchorVariants({ weight, color }), className)}
    >
      {children}
    </button>
  )
}

export default Anchor
