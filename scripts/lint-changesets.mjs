#!/usr/bin/env node
// Checks pending changesets for the mechanical minimums a public changelog entry needs.
// It cannot judge whether prose is good, only that it is not obviously not-prose: no
// conventional-commit prefixes, no "Sync"/"Bump" openers, enough words to describe an
// effect. See the "Writing changesets" section of AGENTS.md for what good looks like.
//
// A change with genuinely nothing customer-visible to say starts its body with [internal];
// that skips the prose rules and keeps the entry off the public changelog.
//
// Usage: node scripts/lint-changesets.mjs [file...]   (defaults to .changeset/*.md)

import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const MIN_CHARS = 20
const MIN_WORDS = 4

const COMMIT_PREFIX = /^(feat|fix|chore|refactor|docs|test|tests|ci|build|perf|style|revert)(\([^)]*\))?!?:/i
// Only openers that never carry an effect. "Refactor X to improve Y" and "Tweak the Z ui"
// do describe one, so they are left alone — a change with no effect uses [internal].
const WEAK_OPENER =
  /^(sync|syncs|synced|bump|bumps|bumped|upgrade deps|update deps|update dependencies|cleanup|clean up|wip|misc|various|minor (fixes|changes)|small (fixes|changes)|update types)\b/i

const files =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : readdirSync('.changeset')
        .filter((file) => file.endsWith('.md') && basename(file).toLowerCase() !== 'readme.md')
        .map((file) => join('.changeset', file))

const problems = []
const fail = (file, rule, detail) => problems.push({ file, rule, detail })

for (const file of files) {
  const raw = readFileSync(file, 'utf8')
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)

  if (!match) {
    fail(file, 'frontmatter', 'no --- frontmatter block naming the packages and bump types')
    continue
  }
  if (!/^\s*['"]?@[^'"\s]+['"]?\s*:\s*(patch|minor|major)\s*$/m.test(match[1])) {
    fail(file, 'frontmatter', 'no `"@scope/package": patch|minor|major` line')
  }

  const body = match[2].trim()
  if (!body) {
    fail(file, 'empty', 'the body is empty — describe the change for someone using the package')
    continue
  }

  if (/^\[internal\]/i.test(body)) continue

  const summary = body.split('\n')[0].trim()

  if (COMMIT_PREFIX.test(summary)) {
    fail(file, 'commit-prefix', `drop the commit-style prefix: ${JSON.stringify(summary.slice(0, 60))}`)
  }
  if (WEAK_OPENER.test(summary)) {
    fail(file, 'weak-opener', `say what changed for the reader, not the mechanics: ${JSON.stringify(summary.slice(0, 60))}`)
  }
  if (body.length < MIN_CHARS) {
    fail(file, 'too-short', `${body.length} characters, minimum ${MIN_CHARS}`)
  }
  if (body.split(/\s+/).filter(Boolean).length < MIN_WORDS) {
    fail(file, 'too-short', `${body.split(/\s+/).filter(Boolean).length} words, minimum ${MIN_WORDS}`)
  }
}

if (problems.length === 0) {
  console.log(`changesets ok (${files.length} checked)`)
  process.exit(0)
}

console.error(`${problems.length} changeset problem(s):\n`)
for (const { file, rule, detail } of problems) console.error(`  ${file}  [${rule}]  ${detail}`)
console.error(`
These are mechanical minimums, not a judgement of the writing. A changeset becomes a public
changelog entry at docs.relay.link/changelog, so write it for someone using the package:
what changed, what it means for them, and what they need to do.

If the change genuinely has no customer-visible effect, start the body with [internal].`)
process.exit(1)
