/**
 * Post-processes dist/styles.css to scope Tailwind v4's global
 * CSS declarations to `.relay-kit-reset`. This prevents the component
 * library from polluting the consuming app's global CSS namespace.
 *
 * Tailwind v4 generates:
 * 1. @layer relay-theme { :root, :host { --relay-* } }
 *    → Scope :root,:host to .relay-kit-reset
 * 2. @property --tw-* { ... }
 *    → Cannot be scoped (global by CSS spec). Low risk since
 *      they use inherits:false and --tw-* names.
 * 3. @layer properties { @supports(...) { *, ::before, ::after, ::backdrop { --tw-* } } }
 *    → Scope to .relay-kit-reset (fallback for browsers without @property)
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cssPath = resolve(__dirname, '../dist/styles.css')

let css = readFileSync(cssPath, 'utf-8')

// 1. Scope the theme layer's `:root, :host` block.
// Pattern: `@layer relay-theme { :root, :host { ... } }`
// We scope each selector to `.relay-kit-reset`.
css = css.replace(
  /(@layer\s+relay-theme\s*\{)\s*(:root\s*,\s*:host)\s*\{/,
  '$1\n  .relay-kit-reset {'
)

// 2. Scope the properties layer's `*, ::before, ::after, ::backdrop` block.
// Pattern: `*, ::before, ::after, ::backdrop { --tw-*: ...; }`
// This is inside @layer properties { @supports(...) { ... } }
css = css.replace(
  /(\*\s*,\s*:?:before\s*,\s*:?:after\s*,\s*::backdrop)\s*\{([^}]*--tw-[^}]*)\}/g,
  (match, selector, body) => {
    const declarations = body.split(';').map((d) => d.trim()).filter(Boolean)
    const allTwVars = declarations.every((d) => d.startsWith('--tw-'))
    if (allTwVars) {
      const scoped = selector
        .split(',')
        .map((s) => `.relay-kit-reset ${s.trim()}`)
        .join(', ')
      return `${scoped} {${body}}`
    }
    return match
  }
)

writeFileSync(cssPath, css)
console.log('Scoped Tailwind v4 base variables to .relay-kit-reset')
