import { type AxiosRequestConfig } from 'axios'
import { getClient } from '../client.js'
import { APIError, getApiKeyHeader } from '../utils/index.js'
import type { paths } from '../types/index.js'
import { axios } from '../utils/axios.js'

export type FastFillBody = NonNullable<
  paths['/fast-fill']['post']['requestBody']['content']['application/json']
>

export type FastFillResponse = NonNullable<
  paths['/fast-fill']['post']['responses']['200']['content']['application/json']
>

export type FastFillParameters = {
  requestId: string
  solverInputCurrencyAmount?: string
}

/**
 * Method to fast fill a request
 * @param parameters - {@link FastFillParameters}
 */
export async function fastFill(
  parameters: FastFillParameters
): Promise<FastFillResponse> {
  const client = getClient()

  if (!client.baseApiUrl || !client.baseApiUrl.length) {
    throw new ReferenceError('RelayClient missing api url configuration')
  }

  const request: AxiosRequestConfig = {
    url: `${client.baseApiUrl}/fast-fill`,
    method: 'post',
    data: parameters,
    headers: getApiKeyHeader(client)
  }
  try {
    const res = await axios.request(request)
    return res.data
  } catch (error: any) {
    throw new APIError(
      error?.message || 'Fast fill failed',
      error?.statusCode || 500,
      error
    )
  }
}
