// CONSUMER SETUP:
// In your app's tailwind.config.ts, add this package's path to content:
//   content: [
//     ...your existing paths,
//     './node_modules/@relayprotocol/relay-kit-ui-v2/dist/**/*.js'
//   ]
// The widget uses only standard Tailwind utility classes and CSS custom properties
// from shadcn/ui conventions (--background, --foreground, --primary, --muted, etc.)
// No additional theme configuration is required.
//
// ANIMATION: The widget uses Tailwind's built-in transition/animate utilities
// plus a small set of keyframes. Add these to your tailwind.config.ts theme.extend:
//
//   theme: {
//     extend: {
//       keyframes: {
//         'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
//         'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
//         'slide-in-from-bottom': { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
//         'slide-in-from-top': { from: { transform: 'translateY(-8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
//         'scale-in': { from: { transform: 'scale(0.95)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
//         'spin-once': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(180deg)' } },
//       },
//       animation: {
//         'fade-in': 'fade-in 150ms ease-out',
//         'fade-out': 'fade-out 150ms ease-in',
//         'slide-in-from-bottom': 'slide-in-from-bottom 200ms ease-out',
//         'slide-in-from-top': 'slide-in-from-top 200ms ease-out',
//         'scale-in': 'scale-in 150ms ease-out',
//         'spin-once': 'spin-once 200ms ease-in-out',
//       }
//     }
//   }

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' }
        },
        'spin-once': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(180deg)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'fade-out': 'fade-out 150ms ease-in',
        'slide-in-from-bottom': 'slide-in-from-bottom 200ms ease-out',
        'slide-in-from-top': 'slide-in-from-top 200ms ease-out',
        'scale-in': 'scale-in 150ms ease-out',
        'spin-once': 'spin-once 200ms ease-in-out'
      }
    }
  }
}

export default config
