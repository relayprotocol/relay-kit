# UI Test Plan — Panda CSS → Tailwind Migration

Goal: Verify zero visual/functional regressions after the CSS migration. This plan is designed to minimize QA effort by testing the highest-impact surfaces first and using a matrix approach to avoid redundant passes.

---

## Testing Matrix

We have 4 dimensions. Instead of testing every combination (explosion), we use a **primary path + targeted sweeps** approach.

| Dimension | Options |
|-----------|---------|
| **Viewport** | Desktop (1280px+), Mobile (375px) |
| **Theme** | Light, Dark |
| **Browser** | Chrome, Safari, Firefox |
| **Widget** | SwapWidget, OnrampWidget, TokenWidget |

**Strategy:**
- Do the full flow walkthroughs on **Chrome Desktop, Light + Dark**
- Do a **mobile sweep** on Chrome + Safari (iOS) for responsive-specific behavior
- Do a **Firefox spot-check** on desktop only (it shares Gecko layout, unlikely to diverge from Chrome on Tailwind)

---

## Phase 1: Core Flows (Chrome Desktop, Light + Dark)

These are the critical happy paths. Each should be tested in both light and dark mode.

### 1.1 SwapWidget — Full Swap Flow
**Page:** `/ui/swap`

- [ ] Widget renders with correct background, border-radius, border, box-shadow
- [ ] Token panels (sell/buy) have correct card background and borders
- [ ] Click "Select Token" → TokenSelector dialog opens (centered, scale animation)
- [ ] ChainFilter sidebar: search works, chains render with square icons, scrollable
- [ ] ChainFilter starring: right-click a chain → star popover appears, chain moves to "Starred"
- [ ] Suggested token pills render with border, no lingering focus ring after click
- [ ] Token list: hover highlights, scroll works, keyboard nav (arrow keys from search)
- [ ] Select an unverified token → UnverifiedTokenModal appears with warning
- [ ] Accept unverified token → modal closes, token selected, persisted in localStorage
- [ ] Enter amount → quote fetches, fee breakdown populates
- [ ] USD mode toggle (⇅ button) switches between token/USD input
- [ ] Swap arrow button: correct border (matches widget card border), hover state works
- [ ] Swap arrow click → tokens swap positions, amounts recalculate
- [ ] SlippageConfig: opens, Auto/Custom tabs work, color-coded rating displays
- [ ] Fee breakdown: collapsible, slippage row always visible, price impact tooltip works
- [ ] CTA button: "Connect Wallet" / "Swap" — italic when enabled, normal when disabled
- [ ] Percentage buttons (25/50/75/100%) apply correct amounts
- [ ] Multi-wallet dropdown: renders for sell side (OriginWalletSelector) and buy side (RecipientSelector)
- [ ] CustomAddressModal: input spans full width, ENS resolution works, recent addresses show

### 1.2 OnrampWidget
**Page:** `/ui/onramp`

- [ ] Widget renders with correct theming
- [ ] Quick amount buttons ($100/$300/$1000) work
- [ ] Token selector opens and functions correctly
- [ ] USD/Token toggle works
- [ ] Address entry works
- [ ] CTA button states render correctly

### 1.3 TokenWidget (Buy/Sell Tabs)
**Page:** `/ui/token`

- [ ] Tabs render and switch between Buy/Sell
- [ ] Active tab indicator styled correctly
- [ ] Both tab flows work: select token → enter amount → destination → swap
- [ ] AmountModeToggle works in both tabs
- [ ] Fee breakdown displays correctly

### 1.4 Chain-Locked Mode
**Page:** `/ui/chain`

- [ ] Widget renders with locked destination chain (Base)
- [ ] Token selector respects chain lock
- [ ] Swap flow completes normally

### 1.5 Deposit Address Flow
**Page:** `/ui/depositAddresses`

- [ ] Deposit address modal renders
- [ ] Waiting for deposit step displays correctly
- [ ] Copy address button works

---

## Phase 2: Dark Mode Sweep (Chrome Desktop)

Run through Phase 1 flows again in dark mode, focusing on these known dark-mode-specific items:

- [ ] Widget background switches to dark gray (`gray-1`)
- [ ] Token selector trigger background is `#202425` (not the light gray)
- [ ] Borders switch from primary4 (violet) to gray5 (visible gray)
- [ ] Swap arrow border matches widget card border (gray5 in dark)
- [ ] Text colors flip correctly (gray-12 for primary text)
- [ ] All modals have correct dark backgrounds and borders
- [ ] Fee breakdown card background correct
- [ ] Tooltip/popover backgrounds correct
- [ ] Input backgrounds correct (gray-3 dark variant)
- [ ] Skeleton loading states use correct dark gray
- [ ] No white flashes or light-mode colors bleeding through

---

## Phase 3: Mobile Sweep (Chrome + Safari iOS, 375px width)

Test these on both light and dark mode on at least one pass.

### 3.1 Dialog Behavior
- [ ] All modals render as **bottom-sheet** (slide up from bottom, not centered)
- [ ] Bottom-sheet animation is smooth (no janky translate conflicts)
- [ ] Full-screen modals (TokenSelector) take full viewport
- [ ] Swipe/tap outside to dismiss works

### 3.2 TokenSelector — Mobile Layout
- [ ] Renders in **tabbed mode** (not sidebar), with "Tokens" / "Chains" tabs
- [ ] MobileChainSelector strip renders at top with horizontal scroll
- [ ] Chain search works in mobile view
- [ ] Keyboard doesn't cause layout jumps

### 3.3 Tooltip → Popover Conversion
- [ ] All tooltips render as **click-to-open popovers** on mobile (not hover)
- [ ] Price impact tooltip, fee breakdown tooltips all tappable
- [ ] Popover dismisses on outside tap

### 3.4 Responsive Layouts
- [ ] Widget fills viewport width correctly
- [ ] Percentage buttons use mobile variant (taller, flex-1)
- [ ] PercentageButtons don't overflow
- [ ] CustomAddressModal input is full width
- [ ] Text doesn't overflow or get clipped
- [ ] Swap arrow button centered correctly between panels

### 3.5 Safari-Specific
- [ ] No iOS input zoom (font-size >= 16px on inputs)
- [ ] Bottom-sheet doesn't conflict with Safari's bottom bar
- [ ] `-webkit-appearance: none` on inputs (spin buttons hidden)
- [ ] Animations use `-webkit-` prefixes where needed (autoprefixer should handle)

---

## Phase 4: Firefox Spot-Check (Desktop only)

Quick pass through the SwapWidget flow:

- [ ] Widget renders correctly (borders, radius, shadows)
- [ ] TokenSelector dialog opens with correct animation
- [ ] All CSS variables resolve correctly
- [ ] Focus ring (box-shadow inset) renders correctly
- [ ] Scrollbar styling acceptable (Firefox uses system scrollbars)
- [ ] Animations play smoothly

---

## Phase 5: Customize Sidebar (Demo-specific)

**Page:** `/ui/swap` with sidebar open

- [ ] Theme color pickers work (primary, text, backgrounds)
- [ ] Border radius slider updates ALL elements: widget, card, modal, input, dropdown, swap button, buttons
- [ ] Italic CTA toggle: ON → enabled buttons italic, disabled buttons normal
- [ ] Dark/Light mode toggle updates all theme variables
- [ ] Reset button clears all overrides
- [ ] Single chain mode toggle works
- [ ] Wallet VM type checkboxes work

---

## Quick Reference: What Changed in Migration

Components that had the most styling changes (highest regression risk):

| Component | Risk | Why |
|-----------|------|-----|
| **Dialog** | High | Animation system rewritten (keyframes + bottom-sheet) |
| **Button** | High | All variants rewritten with CVA, CTA font-style logic changed |
| **TokenSelector** | High | Complex responsive layout, ChainFilter interactions |
| **SwapWidget** | Medium | Many nested styled components, swap arrow border |
| **FeeBreakdown** | Medium | Collapsible animation, tooltip positioning |
| **Input** | Medium | Focus ring changed from border to box-shadow |
| **Tooltip** | Medium | Dual-mode (hover/click) with different components |
| **SuggestedTokens** | Low | Pill styling, focus ring fix |
| **Dropdown** | Low | Simple Radix wrapper |
| **Pill/Switch** | Low | Minimal styling |

---

## Recommended QA Assignment

Split across 2 people to minimize total time:

**Person A (Desktop focus):**
- Phase 1 (all flows, light mode) — ~45 min
- Phase 2 (dark mode sweep) — ~20 min
- Phase 4 (Firefox spot-check) — ~10 min
- Phase 5 (Customize sidebar) — ~15 min

**Person B (Mobile focus):**
- Phase 1.1 on mobile (swap flow only) — ~20 min
- Phase 3 (full mobile sweep, Chrome + Safari) — ~30 min
- Phase 2 on mobile (dark mode) — ~15 min

**Total: ~2.5 hours combined, ~1.5 hours per person**
