import { paths, createClient } from '@relayprotocol/relay-sdk'
import type { NextApiRequest, NextApiResponse } from 'next'

type FastFillRequest =
  paths['/fast-fill']['post']['requestBody']['content']['application/json'] & {
    password?: string // Password for fast fill authentication
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

  const { requestId, solverInputCurrencyAmount, password } =
    req.body as FastFillRequest

  if (!requestId) {
    return res.status(400).json({ error: 'requestId is required' })
  }

  // Check password first (before any API calls)
  const expectedPassword = process.env.FAST_FILL_PASSWORD
  if (!expectedPassword) {
    return res.status(500).json({
      error: 'Fast fill password not configured on server'
    })
  }

  if (!password || password !== expectedPassword) {
    return res.status(401).json({ error: 'Invalid fast fill password' })
  }

  const apiKey = process.env.NEXT_RELAY_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
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
      // Handle APIError from the SDK
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message || 'Fast fill failed'
        })
      }
      throw error
    }
  } catch (error: any) {
    console.error('Fast fill proxy error:', error)
    return res.status(500).json({
      error: error?.message || 'Internal server error'
    })
  }
}
