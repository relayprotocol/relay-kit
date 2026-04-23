import type { Execute } from '../types/Execute.js'

/**
 * Returns true when the step sequence can be collapsed into a single atomic
 * batch transaction.
 *
 * Supported shapes:
 *   [approve, swap | deposit]                     // standard 2-step flow
 *   [approve, approve, swap | deposit]            // zero-reset flow (e.g. USDT on Ethereum)
 *   [approve, ..., approve, swap | deposit]       // N leading approvals + terminal
 *
 * Every item in every step must be incomplete — any already-executed item
 * means we're in the middle of a partial run and should not re-batch.
 */
export function canBatchTransactions(steps: Execute['steps']) {
  if (!steps || steps.length < 2) return false

  const terminalStep = steps[steps.length - 1]
  const prefixSteps = steps.slice(0, -1)

  const terminalIsSwapOrDeposit =
    terminalStep?.id === 'swap' || terminalStep?.id === 'deposit'
  if (!terminalIsSwapOrDeposit) return false

  const prefixAllApprovals = prefixSteps.every(
    (step) => step?.id === 'approve'
  )
  if (!prefixAllApprovals) return false

  const allStepsHaveIncomplete = steps.every((step) =>
    step?.items?.some((item) => item.status === 'incomplete')
  )
  return allStepsHaveIncomplete
}

/**
 * Flattens N approval steps + terminal (swap|deposit) step into a single
 * batched step whose items will be submitted together via EIP-5792
 * `wallet_sendCalls`.
 *
 * The first item stays `incomplete` so the executeSteps iterator picks it as
 * the active step item; all subsequent items are pre-marked `complete` so the
 * iterator doesn't try to execute them again as separate transactions after
 * the batch lands.
 */
export function prepareBatchTransaction(steps: Execute['steps']) {
  const terminalStep = steps[steps.length - 1]
  const terminalId = terminalStep?.id // deposit or swap

  const allItems = steps.flatMap((step) => step.items || [])

  const batchedItems = allItems.map((item, index) => {
    if (index === 0) return item
    // mark non-leading items as complete so we only fire the batch once
    item.status = 'complete'
    item.progressState = 'complete'
    return item
  })

  const batchedStep = {
    id: `approve-and-${terminalId}` as any,
    action: 'Confirm transaction in your wallet',
    description: `Batching approval and ${terminalId} transactions`,
    kind: 'transaction' as const,
    items: batchedItems,
    requestId: terminalStep?.requestId ?? steps[0]?.requestId
  }

  return batchedStep
}
