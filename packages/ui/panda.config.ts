import { defineConfig } from '@pandacss/dev'
import radixColorsPreset from 'pandacss-preset-radix-colors'
import postcss from 'postcss'
import postcssCascadeLayers from '@csstools/postcss-cascade-layers'

export const Colors = {
  // Gray
  gray1: { value: '{colors.slate.1}' },
  gray2: { value: '{colors.slate.2}' },
  gray3: { value: '{colors.slate.3}' },
  gray4: { value: '{colors.slate.4}' },
  gray5: { value: '{colors.slate.5}' },
  gray6: { value: '{colors.slate.6}' },
  gray7: { value: '{colors.slate.7}' },
  gray8: { value: '{colors.slate.8}' },
  gray9: { value: '{colors.slate.9}' },
  gray10: { value: '{colors.slate.10}' },
  gray11: { value: '{colors.slate.11}' },
  gray12: { value: '{colors.slate.12}' },
  // BlackA
  blackA10: { value: '{colors.black.a.10}' },
  // Blue
  blue12: { value: '{colors.blue.12}' },
  // Red
  red2: { value: '{colors.tomato.2}' },
  red3: { value: '{colors.tomato.3}' },
  red4: { value: '{colors.tomato.4}' },
  red5: { value: '{colors.tomato.5}' },
  red6: { value: '{colors.tomato.6}' },
  red9: { value: '{colors.tomato.9}' },
  red10: { value: '{colors.tomato.10}' },
  red11: { value: '{colors.tomato.11}' },
  red12: { value: '{colors.tomato.12}' },
  // Green
  green2: { value: '{colors.grass.2}' },
  green3: { value: '{colors.grass.3}' },
  green9: { value: '{colors.grass.9}' },
  green10: { value: '{colors.grass.10}' },
  green11: { value: '{colors.grass.11}' },
  green12: { value: '{colors.grass.12}' },
  // Yellow
  yellow9: { value: '{colors.yellow.9}' },
  yellow10: { value: '{colors.yellow.10}' },
  yellow11: { value: '{colors.yellow.11}' },
  yellow12: { value: '{colors.yellow.12}' },
  // Amber
  amber2: { value: '{colors.amber.2}' },
  amber3: { value: '{colors.amber.3}' },
  amber4: { value: '{colors.amber.4}' },
  amber9: { value: '{colors.amber.9}' },
  amber10: { value: '{colors.amber.10}' },
  amber11: { value: '{colors.amber.11}' },
  amber12: { value: '{colors.amber.12}' }
}

export default defineConfig({
  jsxFramework: 'react',
  // Whether to use css reset
  preflight: {
    scope: '.relay-kit-reset'
  },

  // Where to look for your css declarations
  include: ['./src/**/*.{js,jsx,ts,tsx}', './pages/**/*.{js,jsx,ts,tsx}'],

  // Files to exclude
  exclude: [],

  hooks: {
    'cssgen:done': ({ artifact, content }) => {
      if (artifact === 'styles.css') {
        return postcss([postcssCascadeLayers()]).process(content).css
      }
    }
  },

  presets: [
    radixColorsPreset({
      darkMode: {
        condition: '.dark &'
      },
      colorScales: [
        'amber',
        'grass',
        'slate',
        'gray',
        'tomato',
        'black',
        'yellow',
        'blue'
      ]
    }),
    // Re-add the panda preset if you want to keep
    // the default keyframes, breakpoints, tokens
    // and textStyles provided by PandaCSS
    '@pandacss/preset-panda'
  ],

  conditions: {
    extend: {
      dark: '.dark &, [data-theme="dark"] &',
      light: '.light &',
      typeNumber: '&[type=number]',
      placeholder_parent: '&[placeholder]',
      spinButtons: '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button',
      data_state_active: '&[data-state="active"]',
      data_state_open: '&[data-state="open"]',
      data_state_open_child: '[data-state=open] &',
      data_state_closed: '&[data-state="closed"]',
      data_swipe_move: '&[data-swipe="move"]',
      data_swipe_cancel: '&[data-swipe="cancel"]',
      data_swipe_end: '&[data-swipe="end"]',
      data_state_checked: '&[data-state="checked"]'
    }
  },
  prefix: 'relay',

  // Useful for theme customization
  theme: {
    tokens: {
      spacing: {
        1: { value: '4px' },
        2: { value: '8px' },
        3: { value: '12px' },
        4: { value: '16px' },
        5: { value: '32px' },
        6: { value: '64px' },
        'widget-card-section-gutter': { value: '6px' }
      },
      fonts: {
        body: { value: 'var(--font-barlow), sans-serif' },
        heading: { value: 'var(--font-chivo), sans-serif' }
      },
      colors: Colors,
      gradients: {
        success: { value: 'linear-gradient(to right, #30A46C, #0ADF79)' }
      }
    },

    semanticTokens: {
      colors: {
        primary1: {
          value: { base: '{colors.violet.1}', _dark: '{colors.violetDark.1}' }
        },
        primary2: {
          value: { base: '{colors.violet.2}', _dark: '{colors.violetDark.2}' }
        },
        primary3: {
          value: { base: '{colors.violet.3}', _dark: '{colors.violetDark.3}' }
        },
        primary4: {
          value: { base: '{colors.violet.4}', _dark: '{colors.violetDark.4}' }
        },
        primary5: {
          value: { base: '{colors.violet.5}', _dark: '{colors.violetDark.5}' }
        },
        primary6: {
          value: { base: '{colors.violet.6}', _dark: '{colors.violetDark.6}' }
        },
        primary7: {
          value: { base: '{colors.violet.7}', _dark: '{colors.violetDark.7}' }
        },
        primary8: {
          value: { base: '{colors.violet.8}', _dark: '{colors.violetDark.8}' }
        },
        primary9: {
          value: { base: '{colors.violet.9}', _dark: '{colors.violetDark.9}' }
        },
        primary10: {
          value: {
            base: '{colors.violet.10}',
            _dark: '{colors.violetDark.10}'
          }
        },
        primary11: {
          value: {
            base: '{colors.violet.11}',
            _dark: '{colors.violetDark.11}'
          }
        },
        primary12: {
          value: {
            base: '{colors.violet.12}',
            _dark: '{colors.violetDark.12}'
          }
        },
        'primary-color': { value: { base: '{colors.primary9}' } },
        'focus-color': { value: { base: '{colors.primary7}' } },
        'subtle-background-color': { value: { base: '{colors.gray.1}' } },
        'subtle-border-color': { value: { base: '{colors.gray.5}' } },

        // Text
        'text-default': { value: { base: '{colors.gray.12}' } },
        'text-subtle': { value: { base: '{colors.gray.11}' } },
        'text-subtle-secondary': { value: { base: '{colors.gray.11}' } },
        'text-error': { value: { base: '{colors.tomato.12}' } },
        'text-success': { value: { base: '{colors.grass.11}' } },

        // Primary Button
        'primary-button-background': { value: { base: '{colors.primary9}' } },
        'primary-button-color': { value: { base: 'white' } },
        'primary-button-hover-background': {
          value: { base: '{colors.primary10}' }
        },
        'primary-button-hover-color': {
          value: { base: 'white' }
        },

        // Secondary Button
        'secondary-button-background': { value: { base: '{colors.primary3}' } },
        'secondary-button-color': { value: { base: '{colors.gray12}' } },
        'secondary-button-hover-background': {
          value: { base: '{colors.primary4}' }
        },
        'secondary-button-hover-color': {
          value: { base: '{colors.gray12}' }
        },

        // Disabled Button
        'button-disabled-background': {
          value: { base: '{colors.gray.8}' }
        },
        'button-disabled-color': {
          value: { base: '{colors.gray.11}' }
        },

        // Input
        'input-background': {
          value: { base: '{colors.gray.3}' }
        },
        'input-color': { value: { base: '{colors.gray.12}' } },

        // Anchor
        'anchor-color': { value: { base: '{colors.primary11}' } },
        'anchor-hover-color': { value: { base: '{colors.primary9}' } },

        // Dropdown
        'dropdown-background': { value: { base: '{colors.gray.3}' } },

        // Widget
        'widget-background': {
          value: { base: 'white', _dark: '{colors.gray.1}' }
        },
        'widget-card-background': { value: { base: '{colors.gray.1}' } },
        'widget-selector-background': { value: { base: '{colors.gray.2}' } },
        'widget-selector-hover-background': {
          value: { base: '{colors.gray.3}' }
        },
        'widget-swap-currency-button-border-color': {
          value: { base: '{colors.primary4}' }
        },

        // Modal
        'modal-background': {
          value: { base: 'white', _dark: '{colors.gray.1}' }
        },

        // Skeleton
        'skeleton-background': { value: { base: '{colors.gray.3}' } }
      },
      radii: {
        'widget-border-radius': { value: { base: '16px' } },
        'widget-card-border-radius': { value: '12px' },
        'modal-border-radius': { value: { base: '16px' } },
        'input-border-radius': { value: { base: '8px' } },
        'dropdown-border-radius': { value: { base: '8px' } },
        'widget-swap-currency-button-border-radius': { value: { base: '8px' } }
      },
      borders: {
        'widget-border': { value: { base: '0px solid white' } },
        'modal-border': { value: { base: '0px solid white' } },
        'dropdown-border': { value: { base: '1px solid {colors.gray5}' } },
        'widget-swap-currency-button-border-width': {
          value: { base: '2px' }
        },
        'widget-card-border': {
          value: { base: '1px solid {colors.primary4}' }
        }
      },
      shadows: {
        'widget-box-shadow': {
          value: { base: '0px 4px 30px rgba(0, 0, 0, 0.10)' }
        }
      }
    },
    extend: {
      tokens: {
        colors: {
          violet: {
            1: { value: '#FDFDFF' },
            2: { value: '#F7F8FF' },
            3: { value: '#EFF1FF' },
            4: { value: '#E4E7FF' },
            5: { value: '#D7DBFF' },
            6: { value: '#C8CCFF' },
            7: { value: '#B4B8FF' },
            8: { value: '#989AFF' },
            9: { value: '#4615C8' },
            10: { value: '#3B00B4' },
            11: { value: '#5A45DF' },
            12: { value: '#2A226E' }
          },
          violetDark: {
            1: { value: '#0E0E23' },
            2: { value: '#141331' },
            3: { value: '#216' },
            4: { value: '#2F0093' },
            5: { value: '#3800A8' },
            6: { value: '#4016B8' },
            7: { value: '#4C24D1' },
            8: { value: '#5B2AF9' },
            9: { value: '#4615C8' },
            10: { value: '#3901AA' },
            11: { value: '#A7AAFF' },
            12: { value: '#DBDEFF' }
          }
        }
      },
      breakpoints: {
        sm: '600px',
        md: '900px',
        lg: '1200px',
        xl: '1400px',
        bp300: '300px',
        bp400: '400px',
        bp500: '500px',
        bp600: '600px',
        bp700: '700px',
        bp800: '800px',
        bp900: '900px',
        bp1000: '1000px',
        bp1100: '1100px',
        bp1200: '1200px',
        bp1300: '1300px',
        bp1400: '1400px',
        bp1500: '1500px'
      },
      semanticTokens: {
        colors: {
          prose: {
            body: {
              value: '{colors.slate.12}'
            }
          }
        }
      }
    },
    keyframes: {
      pulse: {
        '50%': {
          opacity: '0.5'
        }
      },
      'pulse-shadow': {
        '0%': { boxShadow: '0 0 0 0px currentColor' },
        '100%': { boxShadow: '0 0 0 6px currentColor' }
      },
      spin: {
        '100%': {
          transform: 'rotate(360deg)'
        }
      },
      collapsibleSlideDown: {
        from: { height: 0 },
        to: { height: 'var(--radix-collapsible-content-height)' }
      },
      collapsibleSlideUp: {
        from: { height: 'var(--radix-collapsible-content-height)' },
        to: { height: 0 }
      }
    }
  },
  layers: {
    base: 'panda_base',
    recipes: 'panda_recipes',
    reset: 'panda_reset',
    tokens: 'panda_tokens',
    utilities: 'panda_utilities'
  },

  // The output directory for your css system
  outdir: '../design-system',
  importMap: {
    css: '@relayprotocol/relay-design-system/css',
    recipes: '@relayprotocol/relay-design-system/recipes',
    patterns: '@relayprotocol/relay-design-system/patterns',
    jsx: '@relayprotocol/relay-design-system/jsx'
  }
})
