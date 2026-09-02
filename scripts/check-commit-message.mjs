#!/usr/bin/env node
// Validates a PR title: type(scope): subject
//
// Usage: node scripts/check-commit-message.mjs --message "<title>"

const TYPES = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'obs',
  'perf',
  'refactor',
  'revert',
  'style',
  'test'
]

const EXEMPT = [/^Revert ".+"$/, /^Version Packages/, /^Release the: /]

const HEADER_RE = new RegExp(`^(${TYPES.join('|')})(\\([^)]+\\))?!?: \\S.*$`)

const title = (process.argv[2] === '--message' ? process.argv[3] : process.argv[2])?.trim()

if (title && (EXEMPT.some((re) => re.test(title)) || HEADER_RE.test(title))) {
  process.exit(0)
}

console.error(`✖ Invalid PR title:

    ${title ?? ''}

  Expected format:

    type(scope): subject     (scope is optional, "!" marks breaking changes)

  Allowed types: ${TYPES.join(', ')}

  Examples:

    feat(ui): add XRP destination support
    fix: block token contract addresses in recipient field
    chore(sdk): sync api types
`)
process.exit(1)
