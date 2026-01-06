import type { AdaptedWallet, Execute } from '../types/index.js'
import { getClient } from '../client.js'
import {
  executeSteps,
  adaptViemWallet,
  safeStructuredClone,
  APIError,
  getApiKeyHeader
} from '../utils/index.js'
import { type WalletClient } from 'viem'
import { isViemWalletClient } from '../utils/viemWallet.js'
import type { paths } from '../types/index.js'
import type { AxiosRequestConfig } from 'axios'

export type ClaimAppFeesBody = NonNullable<
  paths['/app-fees/{wallet}/claim']['post']['requestBody']['content']['application/json']
>
export type ClaimAppFeesResponse = NonNullable<
  paths['/app-fees/{wallet}/claim']['post']['responses']['200']['content']['application/json']['steps']
>

export type ClaimAppFeesParameters = {
  wallet: AdaptedWallet | WalletClient
  chainId: number
  currency: string
  recipient?: string
  amount?: string
  onProgress?: (data: any) => any
}

/**
 * Claim app fees for a wallet and execute the returned steps
 * @param parameters - {@link ClaimAppFeesParameters}
 */
export async function claimAppFees(
  parameters: ClaimAppFeesParameters
): Promise<{
  data: Execute
  abortController: AbortController
}> {
  const { wallet, chainId, currency, recipient, amount, onProgress } =
    parameters
  const client = getClient()

  if (!client.baseApiUrl || !client.baseApiUrl.length) {
    throw new ReferenceError('RelayClient missing api url configuration')
  }

  let adaptedWallet: AdaptedWallet | undefined
  if (wallet) {
    adaptedWallet = isViemWalletClient(wallet)
      ? adaptViemWallet(wallet as WalletClient)
      : wallet
  }

  if (!adaptedWallet) {
    throw new Error('AdaptedWallet is required to execute claim steps')
  }

  const address = await adaptedWallet.address()

  const abortController = new AbortController()

  const request: AxiosRequestConfig = {
    url: `${client.baseApiUrl}/app-fees/${address}/claim`,
    method: 'post',
    data: { chainId, currency, recipient: recipient || address, amount },
    signal: abortController.signal,
    headers: getApiKeyHeader(client)
  }

  try {
    const res = await client.utils.axios.request(request)
    if (res.status !== 200) {
      throw new APIError(res?.data?.message, res.status, res.data)
    }
    const steps = res.data.steps || []
    const executeJson: Execute = safeStructuredClone({
      steps
    })

    const result = await executeSteps(
      chainId,
      request,
      adaptedWallet,
      (data) => {
        if (abortController.signal.aborted) {
          return
        }
        onProgress?.(data)
      },
      executeJson
    )
    return { data: result, abortController }
  } catch (err) {
    console.error(err)
    throw err
  }
}
