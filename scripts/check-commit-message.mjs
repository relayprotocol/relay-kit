#!/usr/bin/env node
/**
 * Validates a commit message (or PR title) against the Relay commit-message
 * standard used in the backend (solver) repo:
 *
 *   type(scope): subject
 *
 * - `type` is one of the allowed lowercase types below
 * - `(scope)` is optional (e.g. `fix(ui): ...`)
 * - a `!` before the colon marks a breaking change (e.g. `feat!: ...`)
 *
 * Usage:
 *   node scripts/check-commit-message.mjs <path-to-commit-msg-file>   (husky commit-msg hook)
 *   node scripts/check-commit-message.mjs --message "<message>"      (CI PR-title check)
 */

import { readFileSync } from 'node:fs'

const TYPES = [
  'build',
  'canary', // used by the package:canary release script
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

// Messages git generates itself, or that tooling relies on — always allowed.
const EXEMPT = [
  /^Merge /, // merge commits
  /^Revert /, // git revert default message
  /^fixup! /, // git commit --fixup
  /^squash! /, // git commit --squash
  /^Version Packages/ // changesets release PRs
]

const HEADER_RE = new RegExp(`^(${TYPES.join('|')})(\\([^)]+\\))?!?: \\S.*$`)

const args = process.argv.slice(2)
let message
if (args[0] === '--message') {
  message = args[1] ?? ''
} else if (args[0]) {
  message = readFileSync(args[0], 'utf8')
} else {
  console.error('usage: check-commit-message.mjs <file> | --message "<message>"')
  process.exit(2)
}

// First non-comment line is the header
const header = message
  .split('\n')
  .find((line) => !line.startsWith('#'))
  ?.trim()

if (!header) {
  console.error('✖ Empty commit message')
  process.exit(1)
}

if (EXEMPT.some((re) => re.test(header)) || HEADER_RE.test(header)) {
  process.exit(0)
}

console.error(`✖ Commit message does not match the Relay standard:

    ${header}

  Expected format:

    type(scope): subject     (scope is optional, "!" marks breaking changes)

  Allowed types: ${TYPES.join(', ')}

  Examples:

    feat(ui): add XRP destination support
    fix: block token contract addresses in recipient field
    chore(sdk): sync api types
`)
process.exit(1)
