import { MAINNET_RELAY_API, TESTNET_RELAY_API } from '../constants/servers.js'
import type { RelayClient } from '../client.js'

const RELAY_API_URLS = [MAINNET_RELAY_API, TESTNET_RELAY_API]

/**
 * Checks if a URL is a known Relay API endpoint
 * @param url - The URL to validate
 * @returns true if the URL has the same origin as a known Relay API base URL
 */
export function isRelayApiUrl(url: string): boolean {
  try {
    const { origin } = new URL(url)
    return RELAY_API_URLS.some((apiUrl) => new URL(apiUrl).origin === origin)
  } catch {
    return false
  }
}

/**
 * Appends an API-provided endpoint to the base API url
 * @param baseUrl - The configured base API url
 * @param endpoint - Endpoint path from an API response
 * @returns The full url
 * @throws If the result is not on the base API url's origin
 */
export function resolveApiUrl(baseUrl: string, endpoint: string): string {
  // Relative base urls (e.g. '/api/relay') resolve against the page origin
  const pageOrigin =
    typeof window !== 'undefined' ? window.location?.origin : undefined
  const url = new URL(`${baseUrl}${endpoint}`, pageOrigin)
  if (url.origin !== new URL(baseUrl, pageOrigin).origin) {
    throw new Error(`Endpoint ${endpoint} is not on ${baseUrl}`)
  }
  return url.href
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
