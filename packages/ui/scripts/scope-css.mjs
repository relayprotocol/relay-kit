/**
 * Post-processes dist/styles.css to scope Tailwind's global
 * `*, ::before, ::after` and `::backdrop` CSS variable initialization
 * blocks to `.relay-kit-reset`. This prevents the component library
 * from polluting the consuming app's global CSS namespace.
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cssPath = resolve(__dirname, '../dist/styles.css')

let css = readFileSync(cssPath, 'utf-8')

// Pattern: `*, :after, :before { --tw-*: ...; --tw-*: ...; }`
// This block only contains --tw-* CSS custom property declarations.
// Scope it to .relay-kit-reset so it doesn't apply globally.
css = css.replace(
  /(\*\s*,\s*(?::after|::after)\s*,\s*(?::before|::before))\s*\{([^}]*)\}/g,
  (match, selector, body) => {
    // Only scope if the block contains exclusively --tw-* declarations
    const declarations = body.split(';').map((d) => d.trim()).filter(Boolean)
    const allTwVars = declarations.every((d) => d.startsWith('--tw-'))
    if (allTwVars) {
      const scoped = selector
        .split(',')
        .map((s) => `.relay-kit-reset ${s.trim()}`)
        .join(',')
      return `${scoped}{${body}}`
    }
    return match
  }
)

// Pattern: `::backdrop { --tw-*: ...; }`
css = css.replace(
  /(?<!\S)(::backdrop)\s*\{([^}]*)\}/g,
  (match, selector, body) => {
    const declarations = body.split(';').map((d) => d.trim()).filter(Boolean)
    const allTwVars = declarations.every((d) => d.startsWith('--tw-'))
    if (allTwVars) {
      return `.relay-kit-reset ${selector}{${body}}`
    }
    return match
  }
)

writeFileSync(cssPath, css)
console.log('Scoped Tailwind base variables to .relay-kit-reset')
