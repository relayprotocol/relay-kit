// Unsigned XRPL Payment built from a Relay step. The wallet fills in `Fee`,
// `Sequence` and `LastLedgerSequence` before signing.
// https://xrpl.org/docs/references/protocol/transactions/types/payment
export interface XrpPaymentTransaction {
  TransactionType: 'Payment'
  // Sender classic address (r...).
  Account: string
  // Relay deposit classic address (r...).
  Destination: string
  // Amount in drops, as a decimal string (1 XRP = 1,000,000 drops).
  Amount: string
  // Relay order memo: MemoData is the memo text, UTF-8 encoded, as uppercase hex.
  Memos?: { Memo: { MemoData: string } }[]
}

// Callback the integrator supplies to sign and submit the Payment with their
// connected wallet. Resolves with the transaction hash once submitted.
export type XrpSendTransaction = (
  transaction: XrpPaymentTransaction
) => Promise<string>
