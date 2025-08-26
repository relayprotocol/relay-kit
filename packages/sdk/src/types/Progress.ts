import type { Execute, ExecuteStep, ExecuteStepItem } from '../types/Execute.js'

export type ProgressData = {
  steps: Execute['steps']
  fees?: Execute['fees']
  breakdown?: Execute['breakdown']
  details?: Execute['details']
  currentStep?: ExecuteStep | null
  currentStepItem?: ExecuteStepItem
  txHashes?: { txHash: string; chainId: number; isBatchTx?: boolean }[]
  error?: Execute['error']
  refunded?: Execute['refunded']
}
