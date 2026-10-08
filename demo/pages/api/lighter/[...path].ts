import type { NextApiRequest, NextApiResponse } from 'next'
import { isSameSite } from '../../../utils/proxyGuard'

/**
 * Lighter API proxy.
 *
 * Forwards `/api/lighter/*` requests to `https://lighter.fun.xyz/*`
 * injecting the `LIGHTER_API_KEY` server-side so it never ships to
 * clients. Used by the Lighter wallet adapter (pass `apiUrl: '/api/lighter'`
 * when calling `adaptLighterWallet`). Only same-site requests to the
 * adapter's endpoints are forwarded.
 *
 * Handles:
 *   - GET query params (e.g. `/api/v1/account?by=l1_address&value=0x...`)
 *   - POST form-encoded bodies (e.g. `/api/v1/sendTx`)
 *   - POST JSON bodies
 */

export const config = {
  api: {
    bodyParser: false
  }
}

const PATH_PREFIX = '/api/lighter'

async function readRawBody(req: NextApiRequest): Promise<Buffer | undefined> {
  if (
    req.method === 'GET' ||
    req.method === 'HEAD' ||
    req.method === 'OPTIONS'
  ) {
    return undefined
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

// Lighter endpoints the wallet adapter calls: account lookup, nonce, tx
// submission and tx polling. Everything else is rejected.
const ALLOWED_ROUTES: Record<string, string[]> = {
  GET: ['/api/v1/account', '/api/v1/nextNonce', '/api/v1/tx'],
  POST: ['/api/v1/sendTx']
}

// Response headers that should not be mirrored back to the client
const SKIPPED_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-length',
  'content-encoding', // body is already decoded
  'set-cookie'
])

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const method = req.method ?? 'GET'

  if (!isSameSite(req)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  // `req.url` is the raw path + query after Next's routing, e.g.
  // `/api/lighter/api/v1/account?by=l1_address&value=0x...`.
  const url = new URL(req.url ?? '/', 'http://localhost')
  const upstreamPath = url.pathname.replace(PATH_PREFIX, '') || '/'

  if (!(ALLOWED_ROUTES[method] ?? []).includes(upstreamPath)) {
    res.status(404).json({ message: 'Not found' })
    return
  }

  const LIGHTER_API_KEY = process.env.LIGHTER_API_KEY
  const LIGHTER_API_URL = process.env.LIGHTER_API_URL

  if (!LIGHTER_API_KEY) {
    res.status(500).json({ error: 'LIGHTER_API_KEY not configured' })
    return
  }

  if (!LIGHTER_API_URL) {
    res.status(500).json({ error: 'LIGHTER_API_URL not configured' })
    return
  }

  const upstreamUrl = `${LIGHTER_API_URL}${upstreamPath}${url.search}`

  // Only forward the content type; caller headers are otherwise dropped.
  const outboundHeaders: Record<string, string> = {
    'x-api-key': LIGHTER_API_KEY
  }
  const contentType = req.headers['content-type']
  if (typeof contentType === 'string') {
    outboundHeaders['content-type'] = contentType
  }

  const body = await readRawBody(req)

  const upstreamRes = await fetch(upstreamUrl, {
    method,
    headers: outboundHeaders,
    body: body && body.length > 0 ? body : undefined
  })

  if (!upstreamRes.ok) {
    // Log upstream failures server-side so the cause is visible in the
    // Next dev terminal. Clone before consuming so we can still pipe the
    // original body through to the client.
    const cloned = upstreamRes.clone()
    const text = await cloned.text()
    console.warn(
      `[lighter-proxy] upstream ${upstreamRes.status} ${method} ${upstreamPath}\nbody: ${text.slice(0, 500)}`
    )
  }

  res.status(upstreamRes.status)
  upstreamRes.headers.forEach((value, key) => {
    if (SKIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) return
    res.setHeader(key, value)
  })

  const upstreamBody = Buffer.from(await upstreamRes.arrayBuffer())
  res.send(upstreamBody)
}
