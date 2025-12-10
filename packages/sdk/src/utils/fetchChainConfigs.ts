import { configureViemChain } from './chain.js'
import type { RelayChain } from '../types/index.js'
import { axios } from './axios.js'
import { isRelayApiUrl } from './apiKey.js'

export const fetchChainConfigs = async (
  baseApiUrl: string,
  referrer?: string,
  apiKey?: string
): Promise<RelayChain[]> => {
  let queryString = ''
  if (referrer) {
    const queryParams = new URLSearchParams()
    queryParams.set('referrer', referrer)
    queryString = `?${queryParams.toString()}`
  }

  const headers: Record<string, string> = {}
  if (apiKey && isRelayApiUrl(baseApiUrl)) {
    headers['x-api-key'] = apiKey
  }

  const response = await axios.get(`${baseApiUrl}/chains${queryString}`, {
    headers
  })
  if (response.data && response.data.chains) {
    return response.data.chains.map((chain: any) => configureViemChain(chain))
  }
  throw 'No Chain Data'
}
