import type { Config } from 'tailwindcss'

export default {
  prefix: 'relay-',
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    screens: {
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
    extend: {
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '32px',
        6: '64px',
        'widget-card-section-gutter': '6px'
      },
      fontFamily: {
        body: 'var(--relay-fonts-body)',
        heading: 'var(--relay-fonts-heading)'
      },
      borderRadius: {
        widget: 'var(--relay-radii-widget-border-radius)',
        'widget-card': 'var(--relay-radii-widget-card-border-radius)',
        modal: 'var(--relay-radii-modal-border-radius)',
        input: 'var(--relay-radii-input-border-radius)',
        dropdown: 'var(--relay-radii-dropdown-border-radius)',
        'swap-btn': 'var(--relay-radii-widget-swap-currency-button-border-radius)'
      },
      boxShadow: {
        widget: 'var(--relay-shadows-widget-box-shadow)'
      },
      keyframes: {
        pulse: {
          '50%': { opacity: '0.5' }
        },
        'pulse-shadow': {
          '0%': { boxShadow: '0 0 0 0px var(--relay-colors-primary4)' },
          '100%': { boxShadow: '0 0 0 6px var(--relay-colors-primary4)' }
        },
        spin: {
          '100%': { transform: 'rotate(360deg)' }
        },
        collapsibleSlideDown: {
          from: { height: '0' },
          to: { height: 'var(--radix-collapsible-content-height)' }
        },
        collapsibleSlideUp: {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: '0' }
        },
        'dialog-slide-up': {
          from: { opacity: '0', bottom: '-100%' },
          to: { opacity: '1', bottom: '0' }
        },
        'dialog-slide-down': {
          from: { opacity: '1', bottom: '0' },
          to: { opacity: '0', bottom: '-100%' }
        },
        'dialog-fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'dialog-fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' }
        },
        'content-fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        pulse: 'pulse 3s ease-in-out infinite',
        'pulse-shadow': 'pulse-shadow 1s ease-in-out infinite alternate',
        spin: 'spin 1s linear infinite',
        'collapsible-down':
          'collapsibleSlideDown 300ms cubic-bezier(0.87, 0, 0.13, 1)',
        'collapsible-up':
          'collapsibleSlideUp 300ms cubic-bezier(0.87, 0, 0.13, 1)',
        'dialog-slide-up': 'dialog-slide-up 200ms ease-out',
        'dialog-slide-down': 'dialog-slide-down 200ms ease-in',
        'dialog-fade-in': 'dialog-fade-in 100ms linear',
        'dialog-fade-out': 'dialog-fade-out 100ms linear',
        'content-fade-in': 'content-fade-in 300ms ease-out'
      }
    }
  },
  corePlugins: {
    preflight: false
  },
  plugins: []
} satisfies Config
