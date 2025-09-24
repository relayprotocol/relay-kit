import { axios } from './axios.js'

export type TenderlyErrorInfo = {
  error_message?: string
  error?: string
}

export const getTenderlyDetails = (
  chainId: number,
  txHash: string
): Promise<TenderlyErrorInfo | null> => {
  return new Promise((resolve) => {
    axios
      .get(
        `https://api.tenderly.co/api/v1/public-contract/${chainId}/trace/${txHash}`,
        {
          timeout: 5000
        }
      )
      .then((response) => {
        if (response && response.data) {
          // Extract error message from stack_trace
          if (
            response.data.stack_trace &&
            response.data.stack_trace.length > 0
          ) {
            const errorTrace = response.data.stack_trace.find(
              (trace: any) => trace.error_message
            )
            if (errorTrace) {
              resolve({
                error_message: errorTrace.error_message,
                error: errorTrace.error
              })
              return
            }
          }

          // Fallback to call_trace if no error message in stack_trace
          if (response.data.call_trace) {
            // Check root call_trace first
            if (response.data.call_trace.error_message) {
              resolve({
                error_message: response.data.call_trace.error_message,
                error: response.data.call_trace.error
              })
              return
            }

            // Check nested calls
            if (
              response.data.call_trace.calls &&
              Array.isArray(response.data.call_trace.calls)
            ) {
              const callWithError = response.data.call_trace.calls.find(
                (call: any) => call && call.error_message
              )
              if (callWithError) {
                resolve({
                  error_message: callWithError.error_message,
                  error: callWithError.error
                })
                return
              }
            }

            // If no error_message found in call_trace, at least return the error
            if (response.data.call_trace.error) {
              resolve({
                error: response.data.call_trace.error
              })
              return
            }
          }
        }
        resolve(null)
      })
      .catch((e) => {
        console.warn(`Tenderly api failed: ${e}`)
        resolve(null)
      })
  })
}
