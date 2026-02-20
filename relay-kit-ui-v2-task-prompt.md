# Task: Build `@relayprotocol/relay-kit-ui-v2` — A Ground-Up Rebuild of the Swap Widget

## Overview

You are building a brand-new package: `packages/ui-v2` (`@relayprotocol/relay-kit-ui-v2`).

This is a complete ground-up rebuild of `@relayprotocol/relay-kit-ui`, scoped **exclusively to the SwapWidget**. The existing `packages/ui` package must **not be touched at all** — treat it as read-only reference material.

The philosophy of this rebuild:
- **AI-optimized stack**: Use the conventions agents gravitate toward naturally — Tailwind CSS, shadcn/ui primitives, Radix UI, TypeScript with explicit types everywhere.
- **Composable + headless**: Expose headless hooks so consumers can build their own UI on top of the same logic.
- **Zero relay theming**: No PandaCSS, no relay-specific CSS variables. Style via Tailwind + the host app's existing theme (CSS custom properties like `--primary`, `--background`, etc. — shadcn/ui conventions).
- **Drop-in friendly**: Import once, works instantly. No complex theme setup needed.
- **Build speed first**: Optimize every import, use path aliases, tree-shakeable exports, keep bundle tiny.
- **Fully typed**: Every prop, hook return, internal state, and event payload is explicitly typed in TypeScript.
- **Well commented**: Explain the "why" throughout — not just what the code does.
- **Analytics parity**: Preserve every analytics event from the existing package.
- **Accessible by default**: ARIA labels, keyboard navigation, focus management, and screen reader support throughout.
- **Mobile-first responsive**: Every component adapts gracefully from 320px to large desktop screens.
- **Polished micro-interactions**: Subtle, purposeful animations that enhance the UX without distracting.

---

## Reference Reading (Read-Only)

Before writing any code, read the following existing files to understand patterns and logic. **Do not copy code verbatim — extract the logic and rewrite it in the new stack.**

Key files to read:
- `packages/ui/src/components/widgets/SwapWidgetRenderer.tsx` — Core headless renderer pattern, state, and quote logic
- `packages/ui/src/components/widgets/SwapWidget/index.tsx` — UI composition
- `packages/ui/src/components/widgets/FeeBreakdown.tsx` — Fee display logic
- `packages/ui/src/components/widgets/SwapButton.tsx` — CTA button logic
- `packages/ui/src/components/widgets/WidgetContainer.tsx` — Container pattern
- `packages/ui/src/components/common/AmountInput.tsx` — Amount input
- `packages/ui/src/components/common/SlippageToleranceConfig.tsx` — Slippage config UI + logic
- `packages/ui/src/components/common/TokenSelector/TokenSelector.tsx` — Token selector
- `packages/ui/src/components/common/TokenSelector/ChainFilter.tsx` — Chain filter with star/unstar
- `packages/ui/src/components/common/TokenSelector/ChainFilterRow.tsx` — Chain row with star toggle
- `packages/ui/src/components/common/TransactionModal/TransactionModal.tsx` — Transaction flow modal
- `packages/ui/src/components/common/TransactionModal/TransactionModalRenderer.tsx` — Transaction modal headless renderer
- `packages/ui/src/components/common/TransactionModal/steps/` — All transaction step components
- `packages/ui/src/components/common/BalanceDisplay.tsx` — Balance display
- `packages/ui/src/components/common/PercentageButtons.tsx` — Max/percentage buttons
- `packages/ui/src/constants/events.ts` — **All analytics event names — preserve every one**
- `packages/ui/src/types/index.ts` — Token, LinkedWallet types
- `packages/ui/src/types/FeeBreakdown.ts` — FeeBreakdown type
- `packages/ui/src/providers/RelayKitProvider.tsx` — Provider pattern
- `packages/ui/src/providers/RelayClientProvider.tsx` — Relay client context
- `packages/ui/src/hooks/widget/useSwapButtonCta.ts` — CTA hook
- `packages/ui/src/hooks/useCurrencyBalance.ts` — Balance hook
- `packages/ui/src/hooks/useFallbackState.ts` — Controlled/uncontrolled state pattern
- `packages/ui/src/hooks/useDebounceState.ts` — Debounce hook
- `packages/ui/src/utils/quote.ts` — Quote parsing, fee calculation
- `packages/ui/src/utils/numbers.ts` — Number formatting utilities
- `packages/ui/src/utils/slippage.ts` — Slippage utilities
- `packages/ui/src/utils/localStorage.ts` — Starred chains persistence (isChainStarred, toggleStarredChain, getStarredChainIds)
- `packages/hooks/src/hooks/useQuote.ts` — Quote hook (in relay-kit-hooks)
- `packages/hooks/src/hooks/useTokenList.ts` — Token list hook
- `packages/hooks/src/hooks/useRelayChains.ts` — Chains hook
- `demo/pages/ui/swap.tsx` — Demo page for the existing swap widget
- `demo/pages/_app.tsx` — Demo app setup

---

## Package Setup

### Location
Create the package at: `packages/ui-v2/`

### `packages/ui-v2/package.json`

```json
{
  "name": "@relayprotocol/relay-kit-ui-v2",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "peerDependencies": {
    "@tanstack/react-query": ">=5.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": ">=3.0.0",
    "viem": ">=2.26.0",
    "wagmi": "^2.15.6"
  },
  "dependencies": {
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.1.3",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-visually-hidden": "^1.1.2",
    "@relayprotocol/relay-kit-hooks": "workspace:*",
    "@relayprotocol/relay-sdk": "workspace:*",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "fuse.js": "^7.0.0",
    "lucide-react": "^0.400.0",
    "tailwind-merge": "^2.3.0",
    "usehooks-ts": "^3.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tsup": "^8.0.0",
    "typescript": "5.4.5"
  }
}
```

### `packages/ui-v2/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### `packages/ui-v2/tsup.config.ts`

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    'viem',
    'wagmi',
    '@tanstack/react-query',
    'tailwindcss'
  ]
})
```

### Tailwind Configuration (for consumers)

Create `packages/ui-v2/tailwind.config.ts` — the consumer must include the package's content paths in their Tailwind config. Document this at the top of the file:

```ts
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
```

---

## Directory Structure

```
packages/ui-v2/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── tailwind.config.ts
└── src/
    ├── index.ts                    # Public API — named exports only
    │
    ├── constants/
    │   └── events.ts               # Analytics event names (port from existing)
    │
    ├── types/
    │   ├── index.ts                # Re-exports all public types
    │   ├── token.ts                # Token, LinkedWallet types
    │   ├── swap.ts                 # Swap-specific types (TradeType, etc.)
    │   ├── fee.ts                  # FeeBreakdown, BridgeFee types
    │   └── provider.ts             # Provider option types, AppFees
    │
    ├── lib/
    │   ├── utils.ts                # cn() helper (clsx + tailwind-merge)
    │   ├── format.ts               # Number/USD formatting utilities
    │   └── localStorage.ts         # Starred chain persistence helpers
    │
    ├── providers/
    │   ├── RelayClientProvider.tsx # Relay SDK client context
    │   └── RelayKitProvider.tsx    # Top-level provider (wraps RelayClientProvider)
    │
    ├── hooks/
    │   ├── index.ts                # Re-exports all hooks
    │   ├── useRelayClient.ts       # Access relay client from context
    │   ├── useFallbackState.ts     # Controlled/uncontrolled state helper
    │   ├── useDebounceState.ts     # Debounce hook
    │   ├── useCurrencyBalance.ts   # Token balance (EVM + multi-VM)
    │   ├── useWalletAddress.ts     # Resolved wallet address
    │   ├── useStarredChains.ts     # localStorage-backed starred chain state
    │   ├── useSwapButtonCta.ts     # CTA text determination
    │   └── useSwapWidget.ts        # THE MAIN HEADLESS HOOK (see below)
    │
    ├── components/
    │   ├── ui/                     # shadcn/ui-style primitives
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── dialog.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── tabs.tsx
    │   │   ├── tooltip.tsx
    │   │   ├── badge.tsx
    │   │   ├── skeleton.tsx
    │   │   └── switch.tsx
    │   │
    │   ├── swap/                   # Swap widget components
    │   │   ├── SwapWidget.tsx      # Main composed widget
    │   │   ├── TokenPanel.tsx      # From/To token panel with amount input
    │   │   ├── TokenSelector.tsx   # Token search + list modal/drawer
    │   │   ├── ChainFilter.tsx     # Chain sidebar with star/unstar
    │   │   ├── AmountInput.tsx     # Numeric amount input
    │   │   ├── FeeBreakdown.tsx    # Expandable fee breakdown
    │   │   ├── SwapButton.tsx      # CTA button
    │   │   ├── SwapArrow.tsx       # Swap direction toggle arrow
    │   │   ├── SlippageConfig.tsx  # Slippage setting (auto/custom)
    │   │   ├── BalanceDisplay.tsx  # Balance + max button
    │   │   └── PriceImpact.tsx     # Price impact indicator
    │   │
    │   └── transaction/            # Transaction flow modal
    │       ├── TransactionModal.tsx
    │       ├── steps/
    │       │   ├── ConfirmationStep.tsx
    │       │   ├── ApprovalStep.tsx
    │       │   ├── SuccessStep.tsx
    │       │   └── ErrorStep.tsx
    │       └── TransactionProgress.tsx
    │
    └── index.ts
```

---

## Core Implementation Requirements

### 1. `src/lib/utils.ts`

Standard shadcn/ui `cn()` helper:

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind classes safely, resolving conflicts.
 * Use this instead of string concatenation for all className props.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 2. `src/lib/localStorage.ts`

Port the starred chain helpers from `packages/ui/src/utils/localStorage.ts`. Keep the same `localStorage` key (`RELAY_UI_KIT_KEY`) so starred chains persist across widget versions:

```ts
// Key must match the existing package so user preferences are preserved
const RELAY_UI_KIT_KEY = 'relay-ui-kit'

export function isChainStarred(chainId: number): boolean
export function toggleStarredChain(chainId: number): void
export function getStarredChainIds(): number[]
```

### 3. `src/hooks/useStarredChains.ts`

A React hook that wraps the localStorage helpers with reactive state, so the UI updates immediately when a chain is starred/unstarred:

```ts
/**
 * Manages user's starred chain preferences with localStorage persistence.
 * Returns reactive state that updates immediately on toggle.
 *
 * The star key is shared with relay-kit-ui so preferences carry over
 * if an app upgrades from the old package to this one.
 */
export function useStarredChains(): {
  starredChainIds: number[]
  isStarred: (chainId: number) => boolean
  toggleStar: (chainId: number, onAnalyticEvent?: (name: string, data?: any) => void) => void
}
```

The `toggleStar` function should fire `EventNames.CHAIN_STARRED` or `EventNames.CHAIN_UNSTARRED` analytics events.

### 4. `src/constants/events.ts`

Port the **entire** `EventNames` object from `packages/ui/src/constants/events.ts` exactly as-is. Every event name must be preserved. Add a JSDoc comment explaining the analytics callback pattern. Remove Onramp-specific events (anything prefixed `ONRAMP_` or `ONRAMPING_`).

### 5. `src/types/token.ts`

```ts
/**
 * Represents a cross-chain token with its chain context.
 * Mirrors the relay SDK's currency structure for UI consumption.
 */
export type Token = {
  /** The chain ID this token lives on */
  chainId: number
  /** Token contract address. Use the zero address for native tokens (ETH, etc.) */
  address: string
  name: string
  symbol: string
  decimals: number
  /** URL to the token's logo image */
  logoURI: string
  /** Whether this token has been verified by the relay protocol */
  verified?: boolean
}

/**
 * Represents a wallet linked to the user's primary wallet.
 * Used for multi-VM swap support (e.g., EVM + Solana simultaneously).
 */
export type LinkedWallet = {
  address: string
  vmType: ChainVM
  connector: string
  walletLogoUrl?: string
}
```

### 6. `src/types/swap.ts`

```ts
/**
 * Whether the user is specifying an exact input amount or an expected output amount.
 * EXACT_INPUT: "I want to swap exactly X of token A"
 * EXPECTED_OUTPUT: "I want to receive exactly Y of token B"
 */
export type TradeType = 'EXACT_INPUT' | 'EXPECTED_OUTPUT'
```

### 7. `src/hooks/useSwapWidget.ts` — The Headless Hook

This is the most important file in the package. It encapsulates all swap widget state and logic with **zero UI dependency**. It is the direct equivalent of `SwapWidgetRenderer.tsx` from the old package — but exposed as a reusable hook.

The hook should:

- Accept all the same configuration params as `SwapWidgetRendererProps` from the old package
- Manage `fromToken`/`toToken` state (controlled or uncontrolled via `useFallbackState`)
- Manage `amountInputValue` / `amountOutputValue` with debouncing (use `useDebounceState`)
- Manage `tradeType: TradeType`
- Manage `customToAddress`
- Manage `slippageTolerance`
- Manage `gasTopUpEnabled`
- Call `useQuote` from `@relayprotocol/relay-kit-hooks` with the right parameters
- Calculate `feeBreakdown` from quote data (port logic from `packages/ui/src/utils/quote.ts`)
- Calculate `hasInsufficientBalance`, `isInsufficientLiquidityError`, `isCapacityExceededError`
- Calculate `timeEstimate` from quote
- Fire analytics events via `onAnalyticEvent` at the right moments
- Expose a `swap()` function that executes the relay SDK quote
- Track execution `steps` and `swapError`
- Expose `invalidateBalanceQueries()` and `invalidateQuoteQuery()`
- Handle multi-wallet support (`linkedWallets`, `supportedWalletVMs`)
- Return **everything the UI needs** — the UI layer should be purely presentational

**Hook signature (expand and implement fully):**

```ts
export type UseSwapWidgetOptions = {
  // Token state — pass these to make token selection controlled
  fromToken?: Token
  setFromToken?: (token?: Token) => void
  toToken?: Token
  setToToken?: (token?: Token) => void

  // Defaults
  defaultToAddress?: Address
  defaultAmount?: string
  defaultTradeType?: TradeType

  // Settings
  slippageTolerance?: string

  // Wallet
  wallet?: AdaptedWallet
  linkedWallets?: LinkedWallet[]
  multiWalletSupportEnabled?: boolean
  supportedWalletVMs: Omit<ChainVM, 'hypevm' | 'lvm'>[]

  // Context (used to customize event data and logic)
  context?: 'Swap' | 'Deposit' | 'Withdraw'

  // Callbacks
  onConnectWallet?: () => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onSwapError?: (error: string, data?: Execute) => void
  onSwapSuccess?: (data: Execute) => void
  onSwapValidating?: (data: Execute) => void

  // Optional: use a secure proxy URL for quote requests
  useSecureBaseUrl?: (parameters: Parameters<typeof useQuote>['2']) => boolean
}

export type UseSwapWidgetReturn = {
  // Token state
  fromToken?: Token
  setFromToken: (token?: Token) => void
  toToken?: Token
  setToToken: (token?: Token) => void

  // Amount state
  amountInputValue: string
  setAmountInputValue: (value: string) => void
  debouncedInputAmountValue: string
  amountOutputValue: string
  setAmountOutputValue: (value: string) => void
  debouncedOutputAmountValue: string
  tradeType: TradeType
  setTradeType: (type: TradeType) => void

  // Quote
  quote?: ReturnType<typeof useQuote>['data']
  isFetchingQuote: boolean
  quoteError: Error | null
  feeBreakdown: FeeBreakdown | null
  timeEstimate?: { time: number; formattedTime: string }
  quoteParameters?: Parameters<typeof useQuote>['2']

  // Balances
  fromBalance?: bigint
  fromBalancePending?: boolean
  isLoadingFromBalance: boolean
  toBalance?: bigint
  toBalancePending?: boolean
  isLoadingToBalance: boolean

  // Token prices
  fromTokenPriceData: ReturnType<typeof useTokenPrice>['data']
  toTokenPriceData: ReturnType<typeof useTokenPrice>['data']
  isLoadingFromTokenPrice: boolean
  isLoadingToTokenPrice: boolean

  // Validation
  hasInsufficientBalance: boolean
  isInsufficientLiquidityError: boolean
  isCapacityExceededError: boolean
  isCouldNotExecuteError: boolean
  isSameCurrencySameRecipientSwap: boolean
  isValidFromAddress: boolean
  isValidToAddress: boolean

  // Multi-wallet
  isFromNative: boolean
  isSvmSwap: boolean
  isBvmSwap: boolean
  fromChainWalletVMSupported: boolean
  toChainWalletVMSupported: boolean
  supportedWalletVMs: Omit<ChainVM, 'hypevm' | 'lvm'>[]
  linkedWallet?: LinkedWallet
  isRecipientLinked?: boolean
  recipientWalletSupportsChain?: boolean

  // Fee/routing
  highRelayerServiceFee: boolean
  relayerFeeProportion: bigint

  // Address
  address?: Address | string
  recipient?: Address | string
  customToAddress?: Address | string
  setCustomToAddress: (address?: Address | string) => void
  toDisplayName?: string

  // Slippage
  slippageTolerance?: string
  setSlippageTolerance: (value?: string) => void

  // Gas top-up
  gasTopUpEnabled: boolean
  setGasTopUpEnabled: (enabled: boolean) => void
  gasTopUpBalance?: bigint
  gasTopUpRequired: boolean
  gasTopUpAmount?: bigint
  gasTopUpAmountUsd?: string

  // Execution state
  steps: Execute['steps'] | null
  setSteps: (steps: Execute['steps'] | null) => void
  swapError: Error | null
  setSwapError: (error: Error | null) => void
  details: Execute['details'] | null
  setDetails: (details: Execute['details'] | null) => void
  quoteInProgress: Execute | null
  setQuoteInProgress: (quote: Execute | null) => void
  abortController: AbortController | null

  // CTA
  ctaCopy: string

  // Actions
  swap: () => Promise<void>
  invalidateBalanceQueries: () => void
  invalidateQuoteQuery: () => void

  // Transaction modal state (managed here so the headless hook is complete)
  transactionModalOpen: boolean
  setTransactionModalOpen: (open: boolean) => void
  depositAddressModalOpen: boolean

  // Raw relay client access
  relayClient: RelayClient | null
}

export function useSwapWidget(options: UseSwapWidgetOptions): UseSwapWidgetReturn
```

Port all the logic from `SwapWidgetRenderer.tsx` into this hook faithfully. Preserve all analytics event firing. Add a JSDoc comment to every returned property explaining what it is and when it changes.

---

## Accessibility Requirements

Every component must meet **WCAG 2.1 AA** as a baseline. Specific requirements:

### ARIA Labels
- All interactive elements must have `aria-label` or visible label text. Never use an icon-only button without `aria-label`.
- The swap arrow toggle button: `aria-label="Switch from and to tokens"`
- Token selector trigger: `aria-label="Select [from|to] token. Currently [symbol] on [chain]"`
- Amount inputs: `aria-label="[From|To] amount"` with `aria-describedby` pointing to the balance display
- The slippage gear button: `aria-label="Configure slippage tolerance. Currently [auto|X%]"`
- Max balance button: `aria-label="Set maximum [symbol] balance"`
- Chain star button: `aria-label="[Star|Unstar] [chain name]"`
- Close buttons in modals/dialogs: `aria-label="Close"`
- Fee breakdown toggle: `aria-label="[Show|Hide] fee breakdown"`
- Token list items: `role="option"` with `aria-selected`

### Live Regions
- Wrap the quote/fee area in `aria-live="polite"` so screen readers announce when the quote updates.
- On swap success: announce "Swap successful" via a live region.
- On swap error: announce the error via `aria-live="assertive"`.

```tsx
// Example pattern for live region announcements
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {isFetchingQuote ? 'Fetching quote...' : quote ? 'Quote updated' : ''}
</div>
```

### Keyboard Navigation
- **Token selector**: Full keyboard navigation. Arrow keys move focus through the token list. `Enter` selects. `Escape` closes. `/` or typing any character immediately jumps focus to the search input.
- **Chain filter sidebar**: Arrow keys navigate chains. `Enter` selects. `s` key toggles star on focused chain.
- **Swap arrow button**: `Enter` and `Space` both trigger the swap.
- **Slippage popover**: `Escape` closes and restores previous value. Tab moves through auto/custom tabs then the input.
- **Transaction modal**: Focus is trapped inside the modal while open (Radix Dialog handles this automatically — ensure it's used correctly). On close, focus returns to the CTA button.
- **Fee breakdown collapsible**: `Enter` and `Space` both toggle it.
- **All modals/dialogs**: `Escape` closes them.

### Focus Management
- On token selector open: auto-focus the search input.
- On token selector close after selection: return focus to the token trigger button.
- On transaction modal open: focus the primary action button (Confirm).
- Use `@radix-ui/react-visually-hidden` for screen-reader-only text (e.g., describing icon meanings).

### Semantic HTML
- Use `<button>` for all interactive controls, never `<div onClick>`.
- Use `<input type="text" inputMode="decimal">` for amount fields.
- Wrap the widget in `<section>` with `aria-label="Relay Swap Widget"`.
- Token list uses `role="listbox"` with `role="option"` items.
- Chain filter uses `role="list"` with `role="listitem"`.
- Use `<label>` elements associated with inputs via `htmlFor`/`id` pairs, or `aria-labelledby`.

---

## Mobile & Responsive Design Requirements

### Breakpoints
Design for these breakpoints using Tailwind's responsive prefixes:
- `sm` (640px+) — tablet
- `md` (768px+) — wider tablet
- `lg` (1024px+) — desktop

The widget itself has a fixed max-width of `440px` and is horizontally centered. It should be fully usable at 320px minimum viewport width.

### Token Selector — Mobile vs Desktop
On mobile (`< sm`), the token selector renders as a **full-screen Dialog** (bottom sheet style):
- Slides up from the bottom
- Takes 90-95% of viewport height
- Has a drag handle indicator at the top
- Search input is prominently sized (at least 44px touch target height)

On desktop (`>= sm`), it renders as a **Dialog** centered on screen with max-width `480px`.

```tsx
// Pattern for responsive modal sizing
<DialogContent
  className={cn(
    // Mobile: bottom sheet
    "fixed bottom-0 left-0 right-0 rounded-t-2xl max-h-[90vh]",
    // Desktop: centered dialog
    "sm:relative sm:bottom-auto sm:left-auto sm:right-auto sm:rounded-xl sm:max-w-[480px] sm:max-h-[600px]"
  )}
>
```

### Slippage Config — Mobile vs Desktop
On mobile, slippage opens as a Dialog (full-width bottom sheet).
On desktop, it opens as a Popover anchored to the gear button (max-width `200px`).

Use the `useMediaQuery('(max-width: 640px)')` hook from `usehooks-ts` to switch between them.

### Touch Targets
Every interactive element must have a minimum touch target of **44×44px**. Use padding to achieve this without affecting visual size:

```tsx
// Token in list — small visual but large touch target
<button className="flex items-center gap-3 w-full px-4 py-3 min-h-[56px] ...">
```

### Responsive Typography
- Amount input: `text-3xl` on mobile, `text-4xl` on desktop
- Token symbol: `text-base` on mobile, `text-lg` on desktop
- Balance text: `text-xs` consistently (small but readable)

### Scroll Behavior
- Token list and chain filter are independently scrollable within the dialog/modal
- On iOS, use `-webkit-overflow-scrolling: touch` via `overflow-y-auto overscroll-contain`

---

## Animation & Motion Requirements

Keep animations **purposeful, subtle, and fast** (150–300ms). They should enhance perceived performance and provide spatial context — never be decorative or distracting. Respect `prefers-reduced-motion`.

### Reduced Motion
Wrap all animations with a reduced-motion check. Use a utility:

```ts
// In src/lib/utils.ts, add:
/**
 * Returns Tailwind animation class names, but only if the user hasn't
 * requested reduced motion. Falls back to instant transitions.
 */
export function motionSafe(className: string): string {
  // Applied via CSS media query — Tailwind's motion-safe: prefix handles this
  return `motion-safe:${className}`
}
```

Use Tailwind's `motion-safe:` prefix for all animation classes:
```tsx
<div className="motion-safe:animate-fade-in" />
```

### Specific Animations

**Widget mount**: Fade in over 150ms (`animate-fade-in`)

**Swap arrow rotation**: When the user clicks the swap arrow to switch tokens, rotate the icon 180 degrees smoothly:
```tsx
// Track rotation state
<ArrowDownUp
  className={cn(
    "transition-transform duration-200 motion-safe:ease-in-out",
    isRotated && "rotate-180"
  )}
/>
```

**Quote loading skeleton**: While `isFetchingQuote`, show animated Skeleton components in place of the fee breakdown and output amount. Use Tailwind's `animate-pulse` via the Skeleton primitive.

**Token selector open/close**: Slide up from bottom on mobile (`animate-slide-in-from-bottom`), scale in on desktop (`animate-scale-in`).

**Transaction modal steps**: When transitioning between steps (confirmation → approval → success), fade out the old step and fade in the new one. Implement with a key-based fade:
```tsx
<div key={currentStep} className="motion-safe:animate-fade-in">
  {/* step content */}
</div>
```

**Success step**: The checkmark icon should animate in with a brief scale bounce:
```tsx
<CheckCircle className="motion-safe:animate-[scale-in_300ms_ease-out]" />
```

**Star toggle**: When starring/unstarring a chain, the star icon should have a brief scale pop:
```tsx
<Star
  className={cn(
    "transition-all duration-150",
    "motion-safe:active:scale-125",
    isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
  )}
/>
```

**Fee breakdown expand/collapse**: Use the Radix Collapsible component's data attributes for smooth height animation:
```css
/* Add to your global CSS or as a Tailwind plugin */
[data-state='open'] { animation: slide-down 200ms ease-out; }
[data-state='closed'] { animation: slide-up 200ms ease-in; }
@keyframes slide-down { from { height: 0; opacity: 0; } to { height: var(--radix-collapsible-content-height); opacity: 1; } }
@keyframes slide-up { from { height: var(--radix-collapsible-content-height); opacity: 1; } to { height: 0; opacity: 0; } }
```

**Swap button hover state**: Subtle scale on hover + smooth background transition:
```tsx
<Button className="transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]">
```

**Error shake**: When a validation error appears, briefly shake the relevant input panel:
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
```

**Amount input value change**: When the output amount updates from a new quote, briefly highlight the field with a subtle background flash.

---

## Starred Chains Feature

The chain filter in the token selector must support starring/unstarring chains, persisted to `localStorage`. This matches the existing behavior in `ChainFilter.tsx` and `ChainFilterRow.tsx`.

### `src/components/swap/ChainFilter.tsx`

Full-featured chain filter sidebar with:

```ts
type ChainFilterProps = {
  /** All available chains to filter by */
  chains: RelayChain[]
  /** Currently selected chain filter (undefined = all chains) */
  selectedChain?: RelayChain
  onSelectChain: (chain?: RelayChain) => void
  /** Search query for chain name filtering */
  searchQuery?: string
  onAnalyticEvent?: (eventName: string, data?: any) => void
}
```

Implementation requirements:
- Show "All Chains" option at the top (always first, never starred)
- Group chains as: **Starred** (if any) → **Popular** → **All Others**
- Each chain row shows: chain icon, chain name, star button
- Star button uses `useStarredChains` hook — immediately reflects state changes
- Chain name is searchable (fuzzy search with `fuse.js`)
- Fires `EventNames.CURRENCY_STEP_CHAIN_FILTER` when a chain is selected
- Fires `EventNames.CHAIN_STARRED` / `EventNames.CHAIN_UNSTARRED` when star is toggled (via `useStarredChains.toggleStar`)

Star button accessibility:
```tsx
<button
  aria-label={`${isStarred ? 'Unstar' : 'Star'} ${chain.displayName}`}
  aria-pressed={isStarred}
  onClick={(e) => {
    e.stopPropagation() // Don't trigger chain selection
    toggleStar(chain.id, onAnalyticEvent)
  }}
  className={cn(
    "p-1 rounded transition-colors duration-150",
    "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "opacity-0 group-hover:opacity-100 focus:opacity-100", // Show on hover or focus
    isStarred && "opacity-100" // Always show if starred
  )}
>
  <Star
    className={cn(
      "h-3.5 w-3.5 transition-colors duration-150",
      isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
    )}
  />
</button>
```

---

## `src/components/ui/` — shadcn/ui Primitives

Generate these using the standard shadcn/ui patterns. They should use `cn()`, CVA (class-variance-authority), and Radix UI under the hood. Each file must be self-contained with TypeScript props interfaces.

At minimum implement:
- `button.tsx` — with `variant` (default, outline, ghost, destructive) and `size` (sm, default, lg, icon) props. Include `aria-busy` support for loading state.
- `input.tsx` — standard shadcn input with proper `aria-invalid` support
- `dialog.tsx` — wraps Radix Dialog with standard shadcn animations and proper focus management
- `tabs.tsx` — wraps Radix Tabs with keyboard navigation
- `tooltip.tsx` — wraps Radix Tooltip; defer rendering until mouse or keyboard interaction
- `badge.tsx` — with variant prop
- `skeleton.tsx` — loading skeleton with `aria-hidden="true"` (decorative)
- `switch.tsx` — wraps Radix Switch with explicit label association

All components must:
- Accept `className?: string` and merge with `cn()`
- Be `forwardRef` where appropriate
- Have complete TypeScript prop types
- Use Tailwind's `hsl(var(--...))` CSS variable pattern matching shadcn/ui conventions
- Include a brief JSDoc comment explaining the component
- Include `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` on all interactive elements for keyboard focus visibility

### `src/components/ui/dialog.tsx` specifics

The dialog must:
- Use `@radix-ui/react-dialog` primitives
- Include a `DialogHeader`, `DialogTitle` (always present, even if visually hidden for full-screen modals)
- Animate in/out with `data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-out`
- Include overlay with `data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out`
- Expose `onOpenChange` so parent can track open state

---

## `src/components/swap/SwapWidget.tsx` — The Composed Widget

This is the default drop-in component. It:
1. Uses `useSwapWidget` hook internally
2. Composes all the sub-components
3. Manages token selector open state
4. Manages transaction modal open state
5. Renders a clean, minimal card UI using only Tailwind classes

Props interface:
```ts
type SwapWidgetProps = UseSwapWidgetOptions & {
  /** Additional className on the widget container */
  className?: string
  /** Override the widget title. Default: 'Swap' */
  title?: string
  /** Show/hide the settings gear icon (slippage). Default: true */
  showSettings?: boolean
}
```

The widget layout:
```
┌─────────────────────────────────────────┐
│  Swap                    ⚙️ [slippage]  │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │  [Token trigger]       [Amount]     │ │
│ │  Balance: 1.23 ETH         [MAX]    │ │
│ └─────────────────────────────────────┘ │
│              ⇅  [swap arrow]            │
│ ┌─────────────────────────────────────┐ │
│ │  [Token trigger]       [Amount]     │ │
│ │  Balance: 0.00 USDC      ~$0.00     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│  ▼ rate | ⏱ time | fee [collapsible]   │
│                                         │
│        [    Review Swap    ]            │
└─────────────────────────────────────────┘
```

Wrap with:
```tsx
<section aria-label="Relay Swap Widget" className={cn("w-full max-w-[440px] ...", className)}>
  {/* aria-live region for announcements */}
  <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
    {liveAnnouncement}
  </div>
  {/* ... rest of widget */}
</section>
```

---

## `src/components/swap/TokenPanel.tsx`

Renders one side of the swap. Props:
```ts
type TokenPanelProps = {
  side: 'from' | 'to'
  token?: Token
  onSelectToken: () => void
  amount: string
  onAmountChange: (value: string) => void
  /** USD value of the amount, formatted (e.g. '$123.45') */
  amountUsd?: string
  balance?: bigint
  isLoadingBalance?: boolean
  onMaxClick?: () => void
  disabled?: boolean
  showAmountUsd?: boolean
  /** If true, show skeleton in place of amount (quote loading) */
  isLoadingQuote?: boolean
  onAnalyticEvent?: (eventName: string, data?: any) => void
  className?: string
}
```

The amount input fires `SWAP_INPUT_FOCUSED` or `SWAP_OUTPUT_FOCUSED` on focus.

---

## `src/components/swap/TokenSelector.tsx`

A searchable token/chain selector.

Key features:
- Full-text + fuzzy search via `fuse.js`
- Chain filter sidebar using `ChainFilter.tsx` (with star/unstar)
- Uses `useTokenList` from `@relayprotocol/relay-kit-hooks`
- Uses `useRelayChains` from `@relayprotocol/relay-kit-hooks`
- Shows token logo, name, symbol, chain name, balance if available
- Fires `SWAP_START_TOKEN_SELECT`, `SWAP_TOKEN_SELECT`, `SWAP_EXIT_TOKEN_SELECT` events
- Fires `TOKEN_SELECTOR_CONTRACT_SEARCH` when input is a valid contract address
- Fires `UNVERIFIED_TOKEN_ACCEPTED` when user confirms an unverified token

Keyboard navigation requirements:
- Auto-focus search input on open
- Arrow up/down navigate the token list
- `Enter` selects the focused token
- `Escape` closes and fires `SWAP_EXIT_TOKEN_SELECT`
- `/` or any printable character jumps focus to search if not already there
- When chain sidebar is focused, arrow keys navigate chains, `s` toggles star

Accessibility pattern for token list:
```tsx
<div
  role="listbox"
  aria-label="Select a token"
  aria-activedescendant={focusedTokenId}
>
  {tokens.map((token, i) => (
    <div
      key={token.address}
      id={`token-option-${i}`}
      role="option"
      aria-selected={token.address === selectedToken?.address}
      tabIndex={focusedIndex === i ? 0 : -1}
      onKeyDown={handleTokenKeyDown}
    >
      {/* token content */}
    </div>
  ))}
</div>
```

---

## `src/components/swap/FeeBreakdown.tsx`

Collapsible fee breakdown. Shows:
- Swap rate (e.g. "1 ETH = 2,845 USDC")
- Time estimate with `Clock` Lucide icon
- Expandable detail: gas fee, relayer fee, app fee, price impact
- Loading skeleton when `isFetchingQuote`

Accessibility:
```tsx
<button
  aria-expanded={isOpen}
  aria-controls="fee-breakdown-details"
  aria-label={`${isOpen ? 'Hide' : 'Show'} fee breakdown`}
>
  {/* summary row */}
</button>
<div id="fee-breakdown-details" aria-hidden={!isOpen}>
  {/* breakdown items */}
</div>
```

---

## `src/components/swap/SlippageConfig.tsx`

Slippage configuration. Mobile = Dialog, desktop = Popover.

```tsx
// Announce slippage changes to screen readers
<div aria-live="polite" className="sr-only">
  {mode === 'Auto' ? 'Slippage set to auto' : `Slippage set to ${displayValue}%`}
</div>
```

---

## `src/components/transaction/TransactionModal.tsx`

Dialog-based transaction flow. All steps:
1. **ConfirmationStep** — from/to amounts, fees, time. "Confirm Swap" CTA. Cancel button.
2. **ApprovalStep** — spinner + "Approving [token]..." text. Waiting for wallet.
3. **SuccessStep** — animated checkmark, amounts, explorer links, "Swap Again" button.
4. **ErrorStep** — error message, "Try Again" + "Dismiss" buttons.

Analytics events to fire (matching `TransactionModal.tsx` patterns):
- `SWAP_MODAL_OPEN` on open
- `SWAP_MODAL_CLOSED` on close (with whether swap was in progress)
- `APPROVAL_SUBMITTED`, `APPROVAL_SUCCESS`, `APPROVAL_ERROR`
- `DEPOSIT_SUBMITTED`, `DEPOSIT_SUCCESS`, `DEPOSIT_ERROR`
- `BATCH_TX_SUBMITTED`
- `FILL_SUCCESS`, `FILL_ERROR`
- `SWAP_SUCCESS`, `SWAP_ERROR`
- `TRANSACTION_VALIDATING`

Step transitions use key-based fade animations for smooth state changes.

---

## `src/providers/RelayKitProvider.tsx`

Thin provider wrapping `RelayClientProvider`. No theme props.

```ts
export type RelayKitProviderOptions = {
  appName?: string
  appFees?: AppFees
  duneConfig?: { apiBaseUrl?: string; apiKey?: string }
  vmConnectorKeyOverrides?: { [key in number | 'evm' | 'svm' | 'bvm']?: string[] }
  privateChainIds?: string[]
  /** Used for chain icon variants. Defaults to 'light'. */
  themeScheme?: 'dark' | 'light'
  secureBaseUrl?: string
}

export type RelayKitProviderProps = {
  children: ReactNode
  options: RelayClientOptions & RelayKitProviderOptions
}
```

---

## Public API (`src/index.ts`)

```ts
// Provider
export { RelayKitProvider } from '@/providers/RelayKitProvider'
export { RelayClientProvider } from '@/providers/RelayClientProvider'
export type { RelayKitProviderProps, RelayKitProviderOptions } from '@/providers/RelayKitProvider'

// Main widget
export { SwapWidget } from '@/components/swap/SwapWidget'
export type { SwapWidgetProps } from '@/components/swap/SwapWidget'

// Headless hook — for custom UI implementations
export { useSwapWidget } from '@/hooks/useSwapWidget'
export type { UseSwapWidgetOptions, UseSwapWidgetReturn } from '@/hooks/useSwapWidget'

// Sub-components (composable building blocks)
export { TokenPanel } from '@/components/swap/TokenPanel'
export { TokenSelector } from '@/components/swap/TokenSelector'
export { ChainFilter } from '@/components/swap/ChainFilter'
export { FeeBreakdown } from '@/components/swap/FeeBreakdown'
export { SwapButton } from '@/components/swap/SwapButton'
export { SwapArrow } from '@/components/swap/SwapArrow'
export { SlippageConfig } from '@/components/swap/SlippageConfig'
export { BalanceDisplay } from '@/components/swap/BalanceDisplay'
export { TransactionModal } from '@/components/transaction/TransactionModal'

// Individual hooks (for fully custom implementations)
export { useRelayClient } from '@/hooks/useRelayClient'
export { useCurrencyBalance } from '@/hooks/useCurrencyBalance'
export { useSwapButtonCta } from '@/hooks/useSwapButtonCta'
export { useFallbackState } from '@/hooks/useFallbackState'
export { useStarredChains } from '@/hooks/useStarredChains'

// Types
export type { Token, LinkedWallet } from '@/types/token'
export type { TradeType } from '@/types/swap'
export type { FeeBreakdown as FeeBreakdownType, BridgeFee } from '@/types/fee'

// Constants
export { EventNames } from '@/constants/events'

// Utilities
export { cn } from '@/lib/utils'
export { formatDollar, formatNumber, formatBN } from '@/lib/format'
export { isChainStarred, toggleStarredChain, getStarredChainIds } from '@/lib/localStorage'
```

---

## Analytics Events — Full Preservation

Every event from the existing package fires at the same logical moment:

| Event | When |
|---|---|
| `SWAP_CTA_CLICKED` | User clicks the main CTA swap button |
| `QUOTE_ERROR` | Quote fetch returns an error |
| `SWAP_ERROR` | Swap execution fails |
| `SWAP_INPUT_FOCUSED` | User focuses the input amount field |
| `SWAP_OUTPUT_FOCUSED` | User focuses the output amount field |
| `SWAP_ADDRESS_MODAL_CLICKED` | Custom address modal opened |
| `SWAP_SWITCH_NETWORK` | Wallet prompted to switch networks |
| `QUOTE_REQUESTED` | Quote API call initiated |
| `QUOTE_RECEIVED` | Quote API call resolved |
| `SWAP_SLIPPAGE_TOLERANCE_SET` | User sets slippage tolerance |
| `SWAP_MODAL_OPEN` | Transaction confirmation modal opens |
| `SWAP_MODAL_CLOSED` | Transaction confirmation modal closes |
| `SWAP_START_TOKEN_SELECT` | Token selector opens |
| `SWAP_TOKEN_SELECT` | User selects a token |
| `SWAP_EXIT_TOKEN_SELECT` | Token selector closes without selection |
| `DEPOSIT_SUBMITTED` | Deposit transaction submitted |
| `APPROVAL_SUBMITTED` | ERC20 approval tx submitted |
| `APPROVAL_SUCCESS` | ERC20 approval confirmed |
| `APPROVAL_ERROR` | ERC20 approval failed |
| `DEPOSIT_SUCCESS` | Deposit confirmed on chain |
| `DEPOSIT_ERROR` | Deposit failed |
| `BATCH_TX_SUBMITTED` | Batch transaction submitted |
| `FILL_SUCCESS` | Relay fill completed |
| `FILL_ERROR` | Relay fill failed |
| `SWAP_SUCCESS` | Full swap completed successfully |
| `SWAP_ROUTE_SELECTED` | User selects a specific route |
| `TOKEN_SELECTOR_CONTRACT_SEARCH` | User searches by contract address |
| `CTA_SET_MAX_CAPACITY_CLICKED` | Max capacity CTA clicked |
| `CTA_SWITCH_ROUTE_CLICKED` | Route switch CTA clicked |
| `CTA_MAX_CAPACITY_PROMPTED` | Max capacity prompt shown |
| `WALLET_SELECTOR_SELECT` | Multi-wallet selector: wallet selected |
| `WALLET_SELECTOR_OPEN` | Multi-wallet selector opened |
| `WALLET_SELECTOR_CLOSE` | Multi-wallet selector closed |
| `MAX_AMOUNT_CLICKED` | User clicks max balance button |
| `CURRENCY_STEP_CHAIN_FILTER` | User filters by chain in token selector |
| `UNVERIFIED_TOKEN_ACCEPTED` | User accepts an unverified token |
| `GAS_TOP_UP_TOGGLE` | Gas top-up toggle changed |
| `USER_REJECTED_WALLET` | User rejected wallet action |
| `CONNECT_WALLET_CLICKED` | User clicks connect wallet |
| `TRANSACTION_VALIDATING` | Transaction validating state |
| `ADDRESS_MODAL_OPEN` | Address modal opened |
| `ADDRESS_MODAL_CONFIRMED` | Address modal confirmed |
| `CHAIN_STARRED` | User stars a chain (includes `{ chainId, chainName }` data) |
| `CHAIN_UNSTARRED` | User unstars a chain (includes `{ chainId, chainName }` data) |

---

## New Hooks to Add to `packages/hooks`

As you build `ui-v2`, if you identify logic that should live in `@relayprotocol/relay-kit-hooks`, add it there. Specifically:

- If the `useSwapWidget` hook needs a helper that queries the Relay API, extract it into `packages/hooks/src/hooks/` and export it from `packages/hooks/src/index.ts`
- Candidate: `useWalletAddress` — a hook that resolves the active wallet address across EVM and non-EVM VMs

When adding to `packages/hooks`, follow the exact same patterns as the existing hooks.

---

## Demo Integration

Add a new demo page to the existing Next.js demo app at `demo/pages/ui/swap-v2.tsx`.

This page should:
1. Import from `@relayprotocol/relay-kit-ui-v2` (not the old package)
2. Use the same wallet setup as the existing `demo/pages/ui/swap.tsx`
3. Show the new `SwapWidget` component
4. Include a toggle to show a "headless" demo that uses only `useSwapWidget` with a custom minimal UI — this proves the headless hook works independently
5. The headless demo should show the raw hook return values in a simple table below a minimal custom UI — useful for debugging and demonstrating the API

Add the new package to `demo/package.json`:
```json
"@relayprotocol/relay-kit-ui-v2": "workspace:*"
```

Add a nav link in `demo/components/navbar/` pointing to `/ui/swap-v2` labeled "Swap V2".

Also add `packages/ui-v2` to the root `package.json` build scripts:
```json
"build:ui-v2": "pnpm run -C packages/ui-v2 build"
```
And add it to the full `build` script sequence.

---

## Code Quality Requirements

### TypeScript
- Every function, component, hook, and utility must have explicit TypeScript return types
- No `any` — use `unknown` and narrow where needed
- Use `satisfies` operator where helpful for config objects
- Prefer `type` over `interface`

### Comments
- Every exported function/component/hook needs a JSDoc comment
- Complex logic needs inline comments explaining the "why"
- Every type property needs a brief comment if non-obvious
- Comment analytics event firing: `// Analytics: user began token selection`
- Comment accessibility intent: `// a11y: announce quote update to screen readers`
- Comment animation intent: `// motion: rotate swap arrow 180deg for visual direction feedback`

### Imports
- Use the `@/*` alias for all intra-package imports
- Import Lucide icons individually — never `import * as Icons`
- Use named exports everywhere

### Bundle Size
- No lodash, no moment.js
- Only import what you use

### React Patterns
- All components use `FC<Props>` with explicit types
- Use `forwardRef` for all leaf UI components
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback` where reference matters
- No class components

---

## Implementation Order

1. **Package scaffold** — `package.json`, `tsconfig.json`, `tsup.config.ts`, `tailwind.config.ts`
2. **Core utilities** — `src/lib/utils.ts`, `src/lib/format.ts`, `src/lib/localStorage.ts`
3. **Constants** — `src/constants/events.ts`
4. **Types** — all files in `src/types/`
5. **Providers** — `RelayClientProvider`, `RelayKitProvider`
6. **Base hooks** — `useRelayClient`, `useFallbackState`, `useDebounceState`, `useCurrencyBalance`, `useWalletAddress`, `useStarredChains`
7. **UI primitives** — all files in `src/components/ui/`
8. **`useSwapWidget` hook** — the main headless hook
9. **Swap sub-components** — `AmountInput`, `BalanceDisplay`, `SwapArrow`, `SwapButton`, `SlippageConfig`, `ChainFilter`, `TokenPanel`, `TokenSelector`, `FeeBreakdown`
10. **Transaction modal** — all step components, then `TransactionModal`
11. **`SwapWidget.tsx`** — the composed widget
12. **`src/index.ts`** — public API barrel
13. **Demo page** — `demo/pages/ui/swap-v2.tsx`
14. **Verify** — run typecheck, build, open demo, test full swap flow

---

## Validation Checklist

Before considering this task done, verify:

- [ ] `packages/ui-v2` builds without TypeScript errors (`pnpm typecheck`)
- [ ] `packages/ui-v2` builds with tsup (`pnpm build`)
- [ ] `packages/ui` is completely unchanged (`git diff packages/ui` is empty)
- [ ] Demo page renders at `/ui/swap-v2`
- [ ] Token selector opens and token list populates
- [ ] Chain filter shows with star/unstar working and persisting on reload
- [ ] Starred chains appear in their own group at the top of the chain list
- [ ] Switching from/to tokens with the arrow works (and arrow rotates)
- [ ] Typing an amount triggers quote fetch with skeleton loading state
- [ ] Fee breakdown shows and expands/collapses after quote loads
- [ ] Slippage config opens as popover on desktop, dialog on mobile
- [ ] Headless demo on same page demonstrates `useSwapWidget` with custom UI
- [ ] Widget is usable via keyboard only (tab through all interactive elements, select token, type amount, submit)
- [ ] All interactive elements have accessible names (inspect with browser DevTools → Accessibility tab)
- [ ] Animations respect `prefers-reduced-motion` (test in OS settings)
- [ ] Widget renders correctly at 320px viewport width
- [ ] No `any` types remain (`grep -r ': any' packages/ui-v2/src`)
- [ ] All exported hooks and components have JSDoc comments
- [ ] `EventNames` constants match the original package (all swap-related events present)
- [ ] `CHAIN_STARRED` and `CHAIN_UNSTARRED` events fire correctly
