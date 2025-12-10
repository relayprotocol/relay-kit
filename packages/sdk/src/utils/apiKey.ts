import { MAINNET_RELAY_API, TESTNET_RELAY_API } from '../constants/servers.js'
import type { RelayClient } from '../client.js'

const RELAY_API_URLS = [MAINNET_RELAY_API, TESTNET_RELAY_API]

/**
 * Checks if a URL is a known Relay API endpoint
 * @param url - The URL to validate
 * @returns true if the URL starts with a known Relay API base URL
 */
export function isRelayApiUrl(url: string): boolean {
  return RELAY_API_URLS.some((apiUrl) => url.startsWith(apiUrl))
}

/**
 * Gets API key header if client has API key and URL is a Relay API endpoint
 * @param client - The RelayClient instance
 * @param url - Target URL (defaults to client.baseApiUrl)
 * @returns Object with x-api-key header or empty object
 */
export function getApiKeyHeader(
  client: RelayClient | undefined,
  url?: string
): Record<string, string> {
  if (!client?.apiKey) {
    return {}
  }

  const targetUrl = url ?? client.baseApiUrl
  if (!isRelayApiUrl(targetUrl)) {
    return {}
  }

  return { 'x-api-key': client.apiKey }
}
