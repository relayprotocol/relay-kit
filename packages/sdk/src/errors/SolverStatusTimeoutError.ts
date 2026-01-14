export class SolverStatusTimeoutError extends Error {
  txHash: `0x${string}`
  requestId: string

  constructor(txHash: `0x${string}`, requestId: string, attemptCount: number) {
    super(
      `Failed to receive a successful response for solver status check with hash '${txHash}' and request id '${requestId}' after ${attemptCount} attempt(s).`
    )
    this.name = 'SolverStatusTimeoutError'
    this.txHash = txHash
    this.requestId = requestId
  }
}
