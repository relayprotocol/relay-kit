// TonConnect-compatible transaction request shapes.
//
// These mirror the TON Connect `SendTransactionRequest` spec and the request
// shape accepted by wallet providers such as Dynamic's `sendTransaction`:
// https://www.dynamic.xyz/docs/javascript/reference/ton/send-transaction

export interface TonConnectMessage {
  // Destination address (raw "0:..." or user-friendly "EQ.../UQ..." formats).
  address: string
  // Amount to send, in nanotons, as a decimal string (1 TON = 1e9 nanotons).
  amount: string
  // Optional contract payload as a base64-encoded BOC (Bag of Cells).
  payload?: string
  // Optional state init for contract deployment as a base64-encoded BOC.
  stateInit?: string
  // Optional extra currencies keyed by currency id.
  extraCurrency?: { [id: number]: string }
}

export interface TonConnectTransactionRequest {
  // Unix timestamp (in seconds) after which the wallet should reject the tx.
  validUntil: number
  // TonConnect CHAIN id: '-239' for mainnet, '-3' for testnet. Optional — when
  // omitted the wallet uses its currently selected network.
  network?: string
  // Optional sender address.
  from?: string
  // Messages to send. TonConnect allows between 1 and 4 messages per request.
  messages: TonConnectMessage[]
}

export interface TonSendTransactionResponse {
  // Hash of the submitted transaction / external message. Dynamic returns this.
  transactionHash?: string
  // Some wallets / TonConnect return the signed external message BOC instead.
  boc?: string
}

// Callback the integrator supplies to actually sign + broadcast the request via
// their connected wallet (e.g. Dynamic's `sendTransaction`, or TonConnect UI's
// `tonConnectUI.sendTransaction`). The user's key lives in the wallet, so the
// adapter never signs — it only hands over the request and reads the result.
export type TonSendTransaction = (
  request: TonConnectTransactionRequest
) => Promise<TonSendTransactionResponse>

export interface AdaptTonWalletOptions {
  // An existing @ton/ton TonClient used for confirmation polling. If omitted,
  // the adapter lazily creates one from `endpoint` or the Relay chain's
  // `httpRpcUrl`. No API key is required.
  client?: import('@ton/ton').TonClient
  // Explicit TON RPC endpoint (JSON-RPC v2) for confirmation polling. Overrides
  // the Relay-provided chain RPC url.
  endpoint?: string
  // Whether this is a testnet wallet. Used to set the TonConnect `network`
  // field ('-3' testnet vs '-239' mainnet) on outgoing requests.
  isTestnet?: boolean
}
