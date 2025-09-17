import {
  cva,
  css as designCss,
  type Styles
} from '@relayprotocol/relay-design-system/css'
import type { FC, HTMLAttributes } from 'react'
import type { FlexCss } from './Flex.js'

export const PillStyle = cva({
  base: {
    display: 'flex',
    background: 'subtle-background-color',
    px: '3',
    py: '1',
    gap: '1'
  },
  variants: {
    color: {
      red: {
        background: 'red3',
        color: 'red11'
      },
      gray: {
        background: 'gray2',
        color: 'gray8'
      },
      green: {
        background: 'green3',
        color: 'green12'
      },
      amber: {
        background: 'amber2',
        color: 'amber9'
      },
      transparent: {
        background: 'none',
        color: 'gray12'
      },
      primary: {
        background: 'primary3',
        color: 'primary12'
      }
    },
    radius: {
      pill: {
        borderRadius: 25
      },
      rounded: {
        borderRadius: 12
      },
      squared: {
        borderRadius: 8
      }
    },
    bordered: {
      true: {
        '--borderColor': 'colors.gray.6',
        border: '1px solid var(--borderColor)'
      }
    }
  },
  defaultVariants: {
    radius: 'pill'
  }
})

type PillProps = Parameters<typeof PillStyle>['0']

export const Pill: FC<
  HTMLAttributes<HTMLDivElement> & {
    css?: Parameters<(typeof FlexCss)['raw']>[0] & Styles
  } & PillProps
> = ({ css, ...props }) => {
  return (
    <div
      {...props}
      className={designCss(PillStyle.raw(props), designCss.raw(css))}
    ></div>
  )
}

export default Pill
