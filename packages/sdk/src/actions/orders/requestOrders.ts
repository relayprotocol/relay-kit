import type { AxiosRequestConfig } from 'axios'
import { getClient } from '../../client.js'
import { axios, getApiKeyHeader } from '../../utils/index.js'

export async function requestOrders<T>(config: AxiosRequestConfig): Promise<T> {
  const client = getClient()
  if (!client.baseApiUrl || !client.baseApiUrl.length) {
    throw new ReferenceError('RelayClient missing api url configuration')
  }
  const res = await axios.request({
    ...config,
    url: `${client.baseApiUrl}${config.url}`,
    headers: { ...config.headers, ...getApiKeyHeader(client) }
  })
  return res.data
}
