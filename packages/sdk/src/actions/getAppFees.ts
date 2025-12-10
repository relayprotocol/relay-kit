import { type AxiosRequestConfig } from 'axios'
import { axios } from '../utils/axios.js'
import { getClient } from '../client.js'
import { APIError, getApiKeyHeader } from '../utils/index.js'
import type { paths } from '../types/index.js'

export type GetAppFeeBody = NonNullable<
  paths['/app-fees/{wallet}/balances']['get']['parameters']['path']
>

export type GetAppFeesResponse = NonNullable<
  paths['/app-fees/{wallet}/balances']['get']['responses']['200']['content']['application/json']['balances']
>

export type GetAppFeesParameters = {
  wallet: string
}

/**
 * Method to get app fee balances for a wallet
 * @param parameters - {@link GetAppFeesParameters}
 */
export async function getAppFees(
  parameters: GetAppFeesParameters
): Promise<GetAppFeesResponse> {
  const { wallet } = parameters
  const client = getClient()

  if (!client.baseApiUrl || !client.baseApiUrl.length) {
    throw new ReferenceError('RelayClient missing api url configuration')
  }

  const request: AxiosRequestConfig = {
    url: `${client.baseApiUrl}/app-fees/${wallet}/balances`,
    method: 'get',
    headers: getApiKeyHeader(client)
  }

  const res = await axios.request(request)
  if (res.status !== 200) {
    throw new APIError(res?.data?.message, res.status, res.data)
  }
  return res.data.balances || []
}
