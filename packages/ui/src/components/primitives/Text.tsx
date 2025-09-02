import {
  cva,
  css as designCss,
  type Styles
} from '@relayprotocol/relay-design-system/css'
import type { FC, PropsWithChildren } from 'react'

const TextCss = cva({
  base: {
    color: 'text-default',
    fontFamily: 'body'
  },
  variants: {
    style: {
      h1: {
        fontWeight: 800,
        fontSize: '64px',
        fontStyle: 'italic',
        fontFamily: 'heading'
      },
      h2: {
        fontWeight: 700,
        fontSize: '48px'
      },
      h3: {
        fontWeight: 700,
        fontSize: '32px'
      },
      h4: {
        fontWeight: 700,
        fontSize: '24px'
      },
      h5: {
        fontWeight: 700,
        fontSize: '20px'
      },
      h6: {
        fontWeight: 700,
        fontSize: '16px'
      },
      subtitle1: {
        fontWeight: 500,
        fontSize: '16px'
      },
      subtitle2: {
        fontWeight: 500,
        fontSize: '14px'
      },
      subtitle3: {
        fontWeight: 500,
        fontSize: '12px'
      },
      body1: {
        fontWeight: 400,
        fontSize: '16px'
      },
      body2: {
        fontWeight: 400,
        fontSize: '14px'
      },
      body3: {
        fontWeight: 400,
        fontSize: '12px'
      },
      tiny: {
        fontWeight: 500,
        fontSize: 10,
        color: 'gray11'
      }
    },
    color: {
      subtle: {
        color: 'text-subtle'
      },
      subtleSecondary: {
        color: 'text-subtle-secondary'
      },
      error: {
        color: 'text-error'
      },
      red: {
        color: 'red11'
      },
      blue: {
        color: 'blue12'
      },
      success: {
        color: 'text-success'
      },
      warning: {
        color: 'amber12'
      },
      warningSecondary: {
        color: 'amber11'
      }
    },
    italic: {
      true: {
        fontStyle: 'italic'
      }
    },
    ellipsify: {
      true: {
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }
    }
  }
})

type TextCssProps = Parameters<typeof TextCss>['0']

const Text: FC<{ css?: Styles } & TextCssProps & PropsWithChildren> = ({
  css,
  children,
  ...props
}) => {
  return (
    <div className={designCss(TextCss.raw(props), designCss.raw(css))}>
      {children}
    </div>
  )
}

export default Text
