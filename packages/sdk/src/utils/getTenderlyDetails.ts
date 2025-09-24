import { axios } from './axios.js'

export type TenderlyErrorInfo = {
  error_message?: string
  error?: string
}

const extractErrorFromCallTrace = (
  callTrace: any
): { error_message?: string; error?: string } | null => {
  // Check if this call has an error message
  if (callTrace.error_message) {
    return {
      error_message: callTrace.error_message,
      error: callTrace.error
    }
  }

  // Recursively check nested calls
  if (callTrace.calls && Array.isArray(callTrace.calls)) {
    for (const nestedCall of callTrace.calls) {
      const errorInfo = extractErrorFromCallTrace(nestedCall)
      if (errorInfo) {
        return errorInfo
      }
    }
  }

  return null
}

export const getTenderlyDetails = (
  chainId: number,
  txHash: string
): Promise<TenderlyErrorInfo | null> => {
  return new Promise((resolve) => {
    console.log('getTenderlyDetails', txHash)
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
            const errorInfo = extractErrorFromCallTrace(
              response.data.call_trace
            )
            if (errorInfo) {
              resolve(errorInfo)
              return
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
