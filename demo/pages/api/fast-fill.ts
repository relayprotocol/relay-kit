import { paths, createClient } from '@relayprotocol/relay-sdk'
import type { NextApiRequest, NextApiResponse } from 'next'

type FastFillRequest =
  paths['/fast-fill']['post']['requestBody']['content']['application/json'] & {
    password?: string // Password for fast fill authentication
    apiKey?: string // Optional API key override (skips password auth)
  }
type FastFillResponse =
  paths['/fast-fill']['post']['responses']['200']['content']['application/json']
type RequestsV2Response =
  paths['/requests/v2']['get']['responses']['200']['content']['application/json']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FastFillResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { requestId, solverInputCurrencyAmount, password, apiKey: clientApiKey } =
    req.body as FastFillRequest

  if (!requestId) {
    return res.status(400).json({ error: 'requestId is required' })
  }

  let apiKey: string

  if (clientApiKey) {
    // API key provided directly — use it, skip password auth
    apiKey = clientApiKey
  } else {
    // Fall back to password auth + server-side API key
    const expectedPassword = process.env.FAST_FILL_PASSWORD
    if (!expectedPassword) {
      return res.status(500).json({
        error: 'Fast fill password not configured on server'
      })
    }

    if (!password || password !== expectedPassword) {
      return res.status(401).json({ error: 'Invalid fast fill password' })
    }

    const serverApiKey = process.env.NEXT_RELAY_API_KEY
    if (!serverApiKey) {
      return res.status(500).json({ error: 'API key not configured' })
    }
    apiKey = serverApiKey
  }

  const baseApiUrl =
    process.env.NEXT_PUBLIC_RELAY_API_URL || 'https://api.relay.link'

  try {
    // Create a RelayClient instance with the API key and base URL
    const relayClient = createClient({
      baseApiUrl,
      apiKey
    })

    // Call the fast-fill API using the SDK action
    // The fastFill action uses getClient() internally, which will return
    // the client we just created via createClient()
    try {
      const fastFillData = await relayClient.actions.fastFill({
        requestId,
        ...(solverInputCurrencyAmount && { solverInputCurrencyAmount })
      })

      return res.status(200).json(fastFillData)
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(400).json({
          message: error.message || 'Fast fill failed',
          code: error?.rawError?.code ?? 'UNKNOWN_ERROR'
        } as any)
      } else {
        throw error
      }
    }
  } catch (error: any) {
    console.error('Fast fill proxy error:', error)
    return res.status(500).json({
      error: error?.message || 'Internal server error',
      code: 'UNKNOWN_ERROR'
    } as any)
  }
}
