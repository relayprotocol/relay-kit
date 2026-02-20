import { cva, type VariantProps } from 'class-variance-authority'
import type { FC, PropsWithChildren } from 'react'
import { cn } from '../../utils/cn.js'

const textVariants = cva(
  'relay-text-[color:var(--relay-colors-text-default)] relay-font-body',
  {
    variants: {
      style: {
        h1: 'relay-font-[800] relay-text-[64px] relay-font-heading',
        h2: 'relay-font-bold relay-text-[48px]',
        h3: 'relay-font-bold relay-text-[32px]',
        h4: 'relay-font-bold relay-text-[24px]',
        h5: 'relay-font-bold relay-text-[20px]',
        h6: 'relay-font-bold relay-text-[16px]',
        subtitle1: 'relay-font-medium relay-text-[16px]',
        subtitle2: 'relay-font-medium relay-text-[14px]',
        subtitle3: 'relay-font-medium relay-text-[12px]',
        body1: 'relay-font-normal relay-text-[16px]',
        body2: 'relay-font-normal relay-text-[14px]',
        body3: 'relay-font-normal relay-text-[12px]',
        tiny:
          'relay-font-medium relay-text-[10px] relay-text-[color:var(--relay-colors-gray11)]'
      },
      color: {
        subtle: 'relay-text-[color:var(--relay-colors-text-subtle)]',
        subtleSecondary:
          'relay-text-[color:var(--relay-colors-text-subtle-secondary)]',
        error: 'relay-text-[color:var(--relay-colors-text-error)]',
        red: 'relay-text-[color:var(--relay-colors-red11)]',
        blue: 'relay-text-[color:var(--relay-colors-blue12)]',
        success: 'relay-text-[color:var(--relay-colors-text-success)]',
        warning: 'relay-text-[color:var(--relay-colors-amber12)]',
        warningSecondary: 'relay-text-[color:var(--relay-colors-amber11)]'
      },
      italic: {
        true: 'relay-italic'
      },
      ellipsify: {
        true: 'relay-text-ellipsis relay-overflow-hidden relay-whitespace-nowrap'
      }
    }
  }
)

export type TextVariantProps = VariantProps<typeof textVariants>

const Text: FC<{ className?: string } & TextVariantProps & PropsWithChildren> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn(textVariants(props), className)}>
      {children}
    </div>
  )
}

export default Text
