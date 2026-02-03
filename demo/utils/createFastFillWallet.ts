import type { AdaptedWallet, Execute, TransactionStepItem } from '@relayprotocol/relay-sdk'

/**
 * Creates a fast-fill wallet adapter that wraps any AdaptedWallet
 * and intercepts transaction steps to call the fast-fill API
 */
export const createFastFillWallet = (
  originalWallet: AdaptedWallet,
  password: string,
  solverInputCurrencyAmount?: string
): AdaptedWallet => {
  const callFastFillAPI = async (requestId: string) => {
    try {
      console.log('Calling fastFill proxy for requestId:', requestId)
      const body: { requestId: string; password: string; solverInputCurrencyAmount?: string } = {
        requestId,
        password
      }
      if (solverInputCurrencyAmount) {
        body.solverInputCurrencyAmount = solverInputCurrencyAmount
      }
      const response = await fetch('/api/fast-fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const data = await response.json()
        console.log('FastFill called successfully:', data)
      } else {
        const error = await response.json()
        console.warn(
          'FastFill error (continuing with transaction):',
          error.error || error.message
        )
      }
    } catch (e: any) {
      // Log error but don't fail the transaction
      console.warn(
        'FastFill error (continuing with transaction):',
        e?.message || String(e)
      )
    }
  }

  return {
    ...originalWallet,
    handleSendTransactionStep: async (
      chainId: number,
      stepItem: TransactionStepItem,
      step: Execute['steps'][0]
    ) => {
      const txHash = await originalWallet.handleSendTransactionStep(
        chainId,
        stepItem,
        step
      )

      // Call fastFill proxy API if requestId is available and step is deposit
      if (step.requestId && step.id === 'deposit') {
        await callFastFillAPI(step.requestId)
      }

      return txHash
    },
    handleBatchTransactionStep: async (chainId, items, step) => {
      const txHash = await originalWallet?.handleBatchTransactionStep?.(
        chainId,
        items,
        step
      )

      // Call fastFill proxy API if requestId is available
      if (txHash && step.requestId && step.id === 'deposit') {
        await callFastFillAPI(step.requestId)
      }

      return txHash
    }
  }
}
