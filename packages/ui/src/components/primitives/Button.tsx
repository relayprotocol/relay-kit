import {
  cva,
  css as designCss,
  type Styles
} from '@relayprotocol/relay-design-system/css'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

const ButtonCss = cva({
  base: {
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'body',
    fontWeight: 700,
    fontSize: 16,
    transition: 'background-color 250ms linear',
    gap: '2',
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: '20px',
    '--focusColor': 'colors.focus-color',
    _focusVisible: {
      boxShadow: '0 0 0 2px var(--focusColor)'
    },
    _disabled: {
      cursor: 'not-allowed',
      backgroundColor: 'button-disabled-background',
      color: 'button-disabled-color',
      _hover: {
        backgroundColor: 'button-disabled-background',
        color: 'button-disabled-color'
      }
    }
  },
  variants: {
    color: {
      primary: {
        backgroundColor: 'primary-button-background',
        color: 'primary-button-color',
        '&:hover': {
          backgroundColor: 'primary-button-hover-background',
          color: 'primary-button-hover-color'
        }
      },
      secondary: {
        backgroundColor: 'secondary-button-background',
        color: 'secondary-button-color',
        '&:hover': {
          backgroundColor: 'secondary-button-hover-background',
          color: 'secondary-button-hover-color'
        }
      },
      ghost: {
        color: 'text-default',
        backgroundColor: 'transparent'
      },
      white: {
        '--borderColor': 'colors.subtle-border-color',
        backgroundColor: 'widget-background',
        transition: 'filter 250ms linear',
        '&:hover': {
          filter: 'brightness(97%)'
        },
        border: '1px solid var(--borderColor)'
      },
      error: {
        backgroundColor: 'red9',
        color: 'white',
        '&:hover': {
          backgroundColor: 'red10'
        }
      },
      warning: {
        backgroundColor: 'amber3',
        color: 'amber11',
        '&:hover': {
          backgroundColor: 'amber4',
          color: 'amber11'
        }
      },
      grey: {
        backgroundColor: 'gray3',
        color: 'gray11',
        '&:hover': {
          backgroundColor: 'gray4'
        }
      }
    },
    corners: {
      square: {
        borderRadius: 0
      },
      rounded: {
        borderRadius: 8
      },
      pill: {
        borderRadius: 99999
      },
      circle: {
        borderRadius: '99999px',
        alignItems: 'center',
        justifyContent: 'center'
      }
    },
    size: {
      none: {},
      xs: {
        p: '3',
        lineHeight: '16px',
        minHeight: 40
      },
      small: {
        px: '3',
        py: '2',
        lineHeight: '12px',
        minHeight: 40
      },
      medium: {
        px: '5',
        py: '3',
        minHeight: 44
      },
      large: {
        px: '5',
        py: '4',
        minHeight: 52
      }
    },
    cta: {
      true: {
        '&:not(:disabled)': {
          fontFamily: 'heading',
          fontWeight: 700,
          textTransform: 'uppercase',
          fontStyle: 'italic'
        }
      }
    }
  },
  defaultVariants: {
    color: 'primary',
    corners: 'rounded',
    size: 'medium'
  }
})

type ButtonCssProps = Parameters<typeof ButtonCss>['0']

const Button = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'ref'> &
    ButtonCssProps & { css?: Styles }
>(({ css, children, ...props }, forwardedRef) => {
  const { color, size, corners, cta, ...buttonProps } = { ...props }
  return (
    <button
      {...buttonProps}
      ref={forwardedRef}
      className={designCss(
        ButtonCss.raw({ color, size, corners, cta }),
        designCss.raw(css)
      )}
    >
      {children}
    </button>
  )
})

export default Button
