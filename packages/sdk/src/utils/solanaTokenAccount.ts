import { axios } from './axios.js'

export const SOLANA_TOKEN_PROGRAM_IDS = [
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
]

/**
 * Checks whether a Solana address is an account owned by the SPL Token or Token-2022 program.
 * @param rpcUrl - Solana JSON-RPC endpoint
 * @param address - Base58 address to check
 * @param options - Abort signal and request timeout (defaults to 5000ms)
 * @returns true if the account exists and is owned by a token program
 */
export async function isSolanaTokenAccount(
  rpcUrl: string,
  address: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<boolean> {
  const { data } = await axios.post(
    rpcUrl,
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [
        address,
        { encoding: 'base64', dataSlice: { offset: 0, length: 0 } }
      ]
    },
    { signal: options?.signal, timeout: options?.timeoutMs ?? 5000 }
  )

  if (data.error) {
    throw new Error(data.error.message)
  }

  const owner: string | undefined = data.result?.value?.owner
  return owner !== undefined && SOLANA_TOKEN_PROGRAM_IDS.includes(owner)
}
