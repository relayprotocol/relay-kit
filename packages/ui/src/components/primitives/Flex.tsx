import { cva, type VariantProps } from 'class-variance-authority'
import type {
  FC,
  PropsWithChildren,
  CSSProperties,
  HTMLAttributes
} from 'react'
import { cn } from '../../utils/cn.js'

export const flexVariants = cva('relay-flex', {
  variants: {
    align: {
      start: 'relay-items-start',
      center: 'relay-items-center',
      end: 'relay-items-end',
      stretch: 'relay-items-stretch',
      baseline: 'relay-items-baseline',
      normal: 'relay-items-[normal]'
    },
    justify: {
      start: 'relay-justify-start',
      center: 'relay-justify-center',
      end: 'relay-justify-end',
      between: 'relay-justify-between'
    },
    direction: {
      row: 'relay-flex-row',
      column: 'relay-flex-col',
      rowReverse: 'relay-flex-row-reverse',
      columnReverse: 'relay-flex-col-reverse'
    },
    wrap: {
      noWrap: 'relay-flex-nowrap',
      wrap: 'relay-flex-wrap',
      wrapReverse: 'relay-flex-wrap-reverse'
    }
  }
})

export type FlexVariantProps = VariantProps<typeof flexVariants>

const Flex: FC<
  { className?: string; style?: CSSProperties; id?: string } & FlexVariantProps &
    PropsWithChildren &
    Omit<HTMLAttributes<HTMLDivElement>, 'className'>
> = ({
  className,
  style,
  children,
  id,
  align,
  justify,
  direction,
  wrap,
  ...htmlProps
}) => {
  return (
    <div
      className={cn(flexVariants({ align, justify, direction, wrap }), className)}
      style={style}
      id={id}
      {...htmlProps}
    >
      {children}
    </div>
  )
}

export default Flex
