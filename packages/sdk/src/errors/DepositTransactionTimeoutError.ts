export class DepositTransactionTimeoutError extends Error {
  txHash: `0x${string}`
  requestId: string

  constructor(txHash: `0x${string}`, requestId: string, attemptCount: number) {
    super(
      `Deposit transaction with hash '${txHash}' and request id '${requestId}' is pending after ${attemptCount} attempt(s).`
    )
    this.name = 'DepositTransactionTimeoutError'
    this.txHash = txHash
    this.requestId = requestId
  }
}
