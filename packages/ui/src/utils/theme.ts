import type { RelayKitTheme } from '../themes/index.js'
import type { ThemeOverridesMap } from '../providers/RelayKitProvider.js'

export function getValueFromKey(obj: any, key: string): any {
  const keys = key.split('.')
  let value = obj
  for (const k of keys) {
    value = value?.[k]
    if (value === undefined) {
      break
    }
  }
  return value
}

// Pattern matching known token references (e.g. "primary9", "gray12", "white", "black")
const TOKEN_REF_PATTERN =
  /^(primary|gray|red|green|amber|yellow|blue|violet|slate|tomato|grass)\d{1,2}$/

const RAW_CSS_PATTERN =
  /^(#|rgb|hsl|oklch|lch|lab|hwb|color\(|var\()|(\d+(\.\d+)?(px|rem|em|%|vh|vw|ch|ex|cap|ic|lh|rlh|vi|vb|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|cqw|cqh|deg|grad|rad|turn|s|ms))/i

const NAMED_COLORS = new Set(['white', 'black', 'transparent', 'currentColor', 'inherit'])

function resolveThemeValue(value: string): string {
  if (NAMED_COLORS.has(value)) return value
  if (RAW_CSS_PATTERN.test(value)) return value
  if (TOKEN_REF_PATTERN.test(value)) return `var(--relay-colors-${value})`
  // Fallback: treat as raw CSS value
  return value
}

// Generate CSS variables based on theme and overrides
export const generateCssVars = (
  theme?: RelayKitTheme,
  themeOverrides?: ThemeOverridesMap
): string => {
  let cssString = ''
  if (!theme || !themeOverrides) {
    return cssString
  }

  // Recursive function to process full theme object
  const processTheme = (obj: any, prefix: string = '') => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key as keyof typeof obj]
        const fullKey = prefix + key
        const cssVarOverride = getValueFromKey(themeOverrides, fullKey)

        if (typeof value === 'object' && value !== null) {
          processTheme(value, fullKey + '.')
        } else if (cssVarOverride && value) {
          cssString += `${cssVarOverride}:${resolveThemeValue(String(value))};\n`
        }
      }
    }
  }

  processTheme(theme)
  return cssString
}
