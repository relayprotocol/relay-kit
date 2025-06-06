import {
  cva,
  css as designCss,
  type Styles
} from '@reservoir0x/relay-design-system/css'
import type {
  FC,
  PropsWithChildren,
  CSSProperties,
  HTMLAttributes
} from 'react'

export const FlexCss = cva({
  base: {
    display: 'flex'
  },
  variants: {
    align: {
      start: {
        alignItems: 'flex-start'
      },
      center: {
        alignItems: 'center'
      },
      end: {
        alignItems: 'flex-end'
      },
      stretch: {
        alignItems: 'stretch'
      },
      baseline: {
        alignItems: 'baseline'
      },
      normal: {
        alignItems: 'normal'
      }
    },
    justify: {
      start: {
        justifyContent: 'flex-start'
      },
      center: {
        justifyContent: 'center'
      },
      end: {
        justifyContent: 'flex-end'
      },
      between: {
        justifyContent: 'space-between'
      }
    },
    direction: {
      row: {
        flexDirection: 'row'
      },
      column: {
        flexDirection: 'column'
      },
      rowReverse: {
        flexDirection: 'row-reverse'
      },
      columnReverse: {
        flexDirection: 'column-reverse'
      }
    },
    wrap: {
      noWrap: {
        flexWrap: 'nowrap'
      },
      wrap: {
        flexWrap: 'wrap'
      },
      wrapReverse: {
        flexWrap: 'wrap-reverse'
      }
    }
  }
})

type FlexCssProps = Parameters<typeof FlexCss>['0']

const Flex: FC<
  { css?: Styles; style?: CSSProperties; id?: string } & FlexCssProps &
    PropsWithChildren &
    Omit<HTMLAttributes<HTMLDivElement>, 'className'>
> = ({
  css,
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
      className={designCss(
        FlexCss.raw({ align, justify, direction, wrap }),
        designCss.raw(css)
      )}
      style={style}
      id={id}
      {...htmlProps}
    >
      {children}
    </div>
  )
}

export default Flex
