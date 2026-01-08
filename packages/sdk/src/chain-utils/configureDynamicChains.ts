import { getClient } from '../client.js'
import { fetchChainConfigs } from './fetchChainConfigs.js'
import { LogLevel } from '../utils/logger.js'

export async function configureDynamicChains() {
  const client = getClient()
  try {
    const chains = await fetchChainConfigs(
      client.baseApiUrl,
      client.source,
      client.apiKey
    )
    client.chains = chains
    return chains
  } catch (e) {
    client.log(
      ['Failed to fetch remote chain configuration, falling back', e],
      LogLevel.Error
    )
    throw e
  }
}
