import { cva, type VariantProps } from 'class-variance-authority'
import type { FC, HTMLAttributes } from 'react'
import { cn } from '../../utils/cn.js'

export const pillVariants = cva(
  'relay-flex relay-bg-[var(--relay-colors-subtle-background-color)] relay-px-3 relay-py-1 relay-gap-1',
  {
    variants: {
      color: {
        red: 'relay-bg-[var(--relay-colors-red3)] relay-text-[color:var(--relay-colors-red11)]',
        gray: 'relay-bg-[var(--relay-colors-gray2)] relay-text-[color:var(--relay-colors-gray8)]',
        green: 'relay-bg-[var(--relay-colors-green3)] relay-text-[color:var(--relay-colors-green12)]',
        amber: 'relay-bg-[var(--relay-colors-amber2)] relay-text-[color:var(--relay-colors-amber9)]',
        transparent: 'relay-bg-transparent relay-text-[color:var(--relay-colors-gray12)]',
        primary: 'relay-bg-[var(--relay-colors-primary3)] relay-text-[color:var(--relay-colors-primary12)]'
      },
      radius: {
        pill: 'relay-rounded-[25px]',
        rounded: 'relay-rounded-[12px]',
        squared: 'relay-rounded-[8px]'
      },
      bordered: {
        true: 'relay-border relay-border-solid relay-border-[var(--relay-colors-gray-6)]'
      }
    },
    defaultVariants: {
      radius: 'pill'
    }
  }
)

type PillVariantProps = VariantProps<typeof pillVariants>

export const Pill: FC<
  HTMLAttributes<HTMLDivElement> & { className?: string } & PillVariantProps
> = ({ className, color, radius, bordered, ...props }) => {
  return (
    <div
      {...props}
      className={cn(pillVariants({ color, radius, bordered }), className)}
    />
  )
}

export default Pill
