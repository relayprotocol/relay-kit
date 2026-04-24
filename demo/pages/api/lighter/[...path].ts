import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Lighter API proxy.
 *
 * Forwards `/api/lighter/*` requests to `https://lighter.fun.xyz/*`
 * injecting the `LIGHTER_API_KEY` server-side so it never ships to
 * clients. Used by the Lighter wallet adapter (pass `apiUrl: '/api/lighter'`
 * when calling `adaptLighterWallet`).
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

// Hop-by-hop headers that should never be forwarded
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length'
])

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const LIGHTER_API_KEY = process.env.LIGHTER_API_KEY
  const LIGHTER_API_URL = process.env.LIGHTER_API_URL
  const allowedDomains = process.env.ALLOWED_API_DOMAINS
    ? process.env.ALLOWED_API_DOMAINS.split(',')
    : []

  let origin = req.headers.origin || req.headers.referer || ''
  try {
    origin = new URL(origin).origin
  } catch {}

  if (allowedDomains.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-api-key')
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (!LIGHTER_API_KEY) {
    res.status(500).json({ error: 'LIGHTER_API_KEY not configured' })
    return
  }

  if (!LIGHTER_API_URL) {
    res.status(500).json({ error: 'LIGHTER_API_URL not configured' })
    return
  }

  if (allowedDomains.length > 0 && !allowedDomains.includes(origin)) {
    res.status(403).json({ message: 'Forbidden: Origin not allowed' })
    return
  }

  // `req.url` is the raw path + query after Next's routing, e.g.
  // `/api/lighter/api/v1/account?by=l1_address&value=0x...`. Strip the
  // `/api/lighter` prefix and forward the rest verbatim.
  const suffix = (req.url ?? '').replace(PATH_PREFIX, '') || '/'
  const upstreamUrl = `${process.env.LIGHTER_API_URL}${suffix}`

  // Forward request headers minus hop-by-hop + host, plus our auth.
  const outboundHeaders: Record<string, string> = {}
  for (const [name, value] of Object.entries(req.headers)) {
    if (!value) continue
    const lower = name.toLowerCase()
    if (HOP_BY_HOP.has(lower)) continue
    outboundHeaders[name] = typeof value === 'string' ? value : value.join(', ')
  }
  outboundHeaders['x-api-key'] = LIGHTER_API_KEY

  const body = await readRawBody(req)

  const upstreamRes = await fetch(upstreamUrl, {
    method: req.method,
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
      `[lighter-proxy] upstream ${upstreamRes.status} ${req.method} ${upstreamUrl}\nbody: ${text.slice(0, 500)}`
    )
  }

  // Mirror status + content-type. Skip body/transfer-related headers
  // so Node re-computes them correctly.
  res.status(upstreamRes.status)
  upstreamRes.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) return
    if (lower === 'content-encoding') return // body is already decoded
    res.setHeader(key, value)
  })

  const upstreamBody = Buffer.from(await upstreamRes.arrayBuffer())
  res.send(upstreamBody)
}
