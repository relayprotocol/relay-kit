# AGENTS.md — Relay Kit

Conventions and guidelines for AI agents working in this codebase.

## Project Overview

Monorepo (pnpm workspaces) for Relay's cross-chain swap/bridge UI kit.

| Package | Purpose |
|---|---|
| `packages/sdk` | Core SDK — API client, execution logic (Viem-based) |
| `packages/ui` | React UI components (Tailwind v4, Radix primitives) |
| `packages/hooks` | React hooks for SDK integration (TanStack Query) |
| `packages/*-wallet-adapter` | Multi-chain wallet adapters (EVM, SVM, BVM, Tron) |
| `demo/` | Next.js 15 playground |

## Critical Rules

1. **Tailwind `relay:` prefix** — ALL Tailwind classes must use the `relay:` prefix to prevent host app collisions. Example: `relay:bg-white relay:p-4`
2. **Import extensions** — Always use `.js` extensions in imports: `import { x } from './file.js'`
3. **Use `cn()` for class merging** — Never concatenate class strings manually. Import from `utils/cn.js`
4. **CSS variables prefixed `--relay-`** — All custom properties use this prefix
5. **No Tailwind translate on animated elements** — Animated dialogs use CSS classes (`relay-centered-modal`) with hardcoded transforms. Adding Tailwind translate classes breaks animations
6. **Access SDK via hooks** — Use `useRelayClient()` from context, never pass as prop
7. **Prettier**: no semicolons, single quotes, no trailing commas

## Component Patterns

- **Primitives** (`components/primitives/`) — Base UI: Button (CVA variants), Dialog (Radix), Flex, Box, Text, Input, Tabs, AccessibleList
- **Common** (`components/common/`) — Business logic: TokenSelector, ChainFilter, TransactionModal, SlippageConfig
- **Widgets** (`components/widgets/`) — Drop-in components: SwapWidget, OnrampWidget
- **Renderer pattern** — Widgets split into `index.tsx` (state) and `Renderer.tsx` (render logic)

## Styling

- Tailwind v4 with `@layer` scoping (relay-base, relay-components, relay-utilities)
- Theme via CSS variables injected by `RelayKitProvider` into `.relay-kit-reset` wrapper
- Dark mode: `.dark` class or `[data-theme="dark"]` attribute
- Radix color scales (slate, gray, violet, amber, etc.)
- Keyframes prefixed `relay-` to prevent collisions

## Haptic Feedback

Relay Kit exposes an optional `onHapticEvent` callback on `RelayKitProvider`. No haptics library is bundled — integrators provide their own implementation.

### Using haptics in components

```tsx
import { useHapticEvent } from '../../providers/RelayKitProvider.js'

const haptic = useHapticEvent() // safe — wraps in try-catch
haptic('light') // fire haptic
```

### When to use each type

| Type | When | Examples |
|---|---|---|
| `light` | Minor taps, selections | Token select, chain star, max button, toggle, "Done" button |
| `medium` | Primary CTA button press | Swap button, Connect Wallet, onramp CTA |
| `selection` | Picker/tab switches | Chain filter tab, slippage Auto/Custom toggle |
| `success` | Async operation completed | Swap success, onramp complete |
| `error` | Async operation failed | Swap error, approval failure |
| `warning` | Caution moments | Unverified token modal |
| `heavy` | Emphatic gestures | Long-press actions |

### Rules

- **Supplements, never replaces** — Always pair with visual feedback. UI must work without haptics.
- **Match intensity to significance** — Light interactions = `light`/`selection`. CTA = `medium`. Results = `success`/`error`.
- **Don't overuse** — Not every tap should vibrate. Only meaningful moments.
- **Sync with visual change** — Fire at the exact instant the UI updates.
- **iOS caveat** — `haptic()` calls inside `useEffect` or async callbacks won't work on iOS Safari (no user activation context). For async results like swap success, the haptic fires for Android/desktop; iOS users get haptic on the subsequent "Done" tap instead.

### Anti-patterns

- Haptic on every tap (fatigue)
- `error` type for non-errors
- Haptic without accompanying visual feedback
- Haptic on page load or passive scroll
- `heavy` for minor interactions

## Wallet & Chain Patterns

- `LinkedWallet` type: `{ address, vmType, connector, walletLogoUrl? }`
- VM types: `'evm' | 'svm' | 'bvm' | 'tvm'`
- Chain icons: `https://assets.relay.link/icons/square/{chainId}/light.png` (or `dark.png`)
- Token logos: `https://assets.relay.link/icons/currencies/{id}.png`
- Address validation per VM type via `isValidAddress(address, vmType)`

## State & Data

- `RelayKitProvider` → `ProviderOptionsContext` (theme, haptics, app config)
- `RelayClientProvider` → `useRelayClient()` (SDK client instance)
- Data fetching: TanStack Query v5 via hooks package (`useQuote`, `useTokenList`, `useRelayChains`)
- localStorage key: `relay-ui-kit` (starred chains, accepted unverified tokens)

## Writing changesets

Every changeset becomes a public changelog entry at
[docs.relay.link/changelog](https://docs.relay.link/changelog). Write it for someone
*using* the package, not for someone reading the diff.

**Required shape** — lead with the outcome, then the effect, then any action:

```md
---
'@relayprotocol/relay-sdk': minor
---

Add TON support: new `@relayprotocol/relay-ton-wallet-adapter` package exporting
`adaptTonWallet`, plus `tonvm` support across the SDK and UI kit.
```

### Rules

1. **State what changed for the reader**, not the mechanics. "Sync SDK types" and "Refactor
   the token selector" describe the diff; "Suggested tokens now use the API's `logoURI`"
   describes the change.
2. **No commit-style prefixes** — `feat:`, `fix:`, `chore:` belong in the commit, not here.
3. **Name the surface exactly** — endpoint, hook, prop, error code, parameter. Preserve exact
   identifiers and versions.
4. **Breaking changes state the migration.** What was removed or renamed, what to use
   instead, in the same entry. A breaking change without migration guidance is incomplete.
5. **One changeset per customer outcome.** A change spanning SDK, UI kit, and hooks is one
   changeset naming all three packages — not three changesets.
6. **Nothing customer-visible?** Start the body with `[internal]`. That keeps it out of the
   public changelog and skips the prose checks. Use it for refactors, test-only changes, and
   dependency bumps — not as a way past the linter.
7. **Don't guess at impact.** If you cannot state the user-visible effect, say what changed
   and let review fill in the rest, or mark it `[internal]`.

### Anti-patterns

| Don't | Do |
|---|---|
| `Sync api types` | `[internal] Sync generated API types` |
| `fix: dead address` | `Fix the Bitcoin dead-address preview error on same-chain quotes` |
| `Refactor EOA detection` | `Detect EOAs before quoting so smart-account routes are not offered to EOAs` |
| `Add mappings` | `Add TRANSACTION_SUBMISSION_FAILED and TRANSACTION_NOT_INCLUDED to the failure reasons surfaced on the transaction page` |

`pnpm lint:changesets` enforces the mechanical minimums — prefixes, weak openers, and a
length floor. It cannot tell whether the writing is good, only whether it is obviously not
prose, so passing it is the floor rather than the goal.

## Build

```bash
pnpm install          # install deps
pnpm build            # build all packages
pnpm dev              # run demo app
pnpm test             # run tests (SDK)
```

- Output: `_esm/`, `_cjs/`, `_types/`, `dist/` (CSS)
- CSS built via Tailwind CLI then copied to ESM/CJS output dirs
- `sideEffects: ["./dist/styles.css"]` ensures CSS isn't tree-shaken
