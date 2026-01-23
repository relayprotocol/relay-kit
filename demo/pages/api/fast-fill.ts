import { paths } from '@relayprotocol/relay-sdk'
import type { NextApiRequest, NextApiResponse } from 'next'

type FastFillRequest = paths['/fast-fill']['post']['requestBody']['content']['application/json']
type FastFillResponse = paths['/fast-fill']['post']['responses']['200']['content']['application/json']
type RequestsV2Response = paths['/requests/v2']['get']['responses']['200']['content']['application/json']

// Whitelist of allowed user addresses
const WHITELISTED_USERS = ['0x03508bB71268BBA25ECaCC8F620e01866650532c']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FastFillResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { requestId, solverInputCurrencyAmount } = req.body as FastFillRequest

  if (!requestId) {
    return res.status(400).json({ error: 'requestId is required' })
  }

  const apiKey = process.env.NEXT_RELAY_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const baseApiUrl = process.env.NEXT_PUBLIC_RELAY_API_URL || 'https://api.relay.link'

  try {
    // Fetch the request to check user and status
    const requestsUrl = new URL(`${baseApiUrl}/requests/v2`)
    requestsUrl.searchParams.set('id', requestId)

    const requestsResponse = await fetch(requestsUrl.href, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    })

    if (!requestsResponse.ok) {
      return res.status(requestsResponse.status).json({
        error: `Failed to fetch request: ${requestsResponse.statusText}`
      })
    }

    const requestsData = (await requestsResponse.json()) as RequestsV2Response
    const request = requestsData.requests?.[0]

    if (!request) {
      return res.status(404).json({ error: 'Request not found' })
    }

    // Check if user is whitelisted
    const user = request.user?.toLowerCase()
    const isWhitelisted = WHITELISTED_USERS.some(
      (addr) => addr.toLowerCase() === user
    )

    if (!isWhitelisted) {
      return res.status(403).json({
        error: `User ${request.user} is not whitelisted for fast fill`
      })
    }

    // Check if request is already in success status
    if (request.status === 'success') {
      return res.status(400).json({
        error: 'Request is already in success status'
      })
    }

    // Call the fast-fill API
    const fastFillUrl = `${baseApiUrl}/fast-fill`
    const fastFillBody: FastFillRequest = {
      requestId,
      ...(solverInputCurrencyAmount && { solverInputCurrencyAmount })
    }

    const fastFillResponse = await fetch(fastFillUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(fastFillBody)
    })

    const fastFillData = await fastFillResponse.json()

    if (!fastFillResponse.ok) {
      return res.status(fastFillResponse.status).json({
        error: fastFillData.error || fastFillData.message || 'Fast fill failed'
      })
    }

    return res.status(200).json(fastFillData as FastFillResponse)
  } catch (error: any) {
    console.error('Fast fill proxy error:', error)
    return res.status(500).json({
      error: error?.message || 'Internal server error'
    })
  }
}
