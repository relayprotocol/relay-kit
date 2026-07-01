import type { Execute } from '../types/index.js'

export function getCurrentStepData(steps: Execute['steps']) {
  let currentStep: NonNullable<Execute['steps']>['0'] | null = null
  let currentStepItem: NonNullable<Execute['steps'][0]['items']>[0] | undefined
  let txHashes: { txHash: string; chainId: number }[] = []

  for (const step of steps) {
    for (const item of step.items || []) {
      if (item.txHashes && item.txHashes.length > 0) {
        txHashes = item.txHashes.concat([...txHashes])
      }
      if (item.internalTxHashes && item.internalTxHashes.length > 0) {
        txHashes = item.internalTxHashes.concat([...txHashes])
      }
      if (item.status === 'incomplete') {
        currentStep = step
        currentStepItem = item
        break // Exit the inner loop once the first incomplete item is found
      }
    }
    if (currentStep && currentStepItem) break // Exit the outer loop if the current step and item have been found
  }

  return { currentStep, currentStepItem, txHashes }
}
