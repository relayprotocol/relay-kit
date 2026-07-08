import { MAINNET_RELAY_API, TESTNET_RELAY_API } from '@relayprotocol/relay-sdk'
import type { NextApiRequest, NextApiResponse } from 'next'

const DEV_RELAY_API = 'https://api.dev.relay.link'

// Maps the env segment (first path part, e.g. /api/relay/mainnets/...) to the
// upstream Relay API base, keeping the mainnet/testnet/dev toggle working.
const ENV_TO_BASE: Record<string, string> = {
  mainnets: MAINNET_RELAY_API,
  testnets: TESTNET_RELAY_API,
  'mainnets-dev': DEV_RELAY_API
}

// Only allow calls originating from this app itself
function isSameSite(req: NextApiRequest): boolean {
  const host = req.headers.host
  const source = req.headers.origin ?? req.headers.referer
  if (!host || !source) return false
  try {
    return new URL(source).host === host
  } catch {
    return false
  }
}

/**
 * Server-side proxy for the Relay API. Injects the `x-api-key` header (kept out
 * of the client bundle) so authenticated endpoints like GET /requests/v3 work.
 *
 * Point Relay Kit's `baseApiUrl` at `/api/relay/<env>` where <env> is one of
 * `mainnets`, `testnets`, or `mainnets-dev`.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isSameSite(req)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : req.query.path
      ? [req.query.path]
      : []

  const [env, ...rest] = segments
  const upstreamBase = ENV_TO_BASE[env ?? '']

  if (!upstreamBase) {
    res.status(400).json({ message: `Unknown Relay API environment: ${env}` })
    return
  }

  const target = new URL(`${upstreamBase}/${rest.join('/')}`)

  // Forward the SDK's query params (everything except the catch-all `path`).
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path' || value === undefined) continue
    if (Array.isArray(value)) {
      value.forEach((v) => target.searchParams.append(key, v))
    } else {
      target.searchParams.set(key, value)
    }
  }

  const method = req.method ?? 'GET'
  const hasBody = method !== 'GET' && method !== 'HEAD' && Boolean(req.body)

  const upstream = await fetch(target.href, {
    method,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(process.env.NEXT_RELAY_API_KEY
        ? { 'x-api-key': process.env.NEXT_RELAY_API_KEY }
        : {})
    },
    body: hasBody ? JSON.stringify(req.body) : undefined
  })

  const contentType = upstream.headers.get('content-type') ?? ''
  res.status(upstream.status)

  if (contentType.includes('application/json')) {
    res.json(await upstream.json())
  } else {
    res.send(await upstream.text())
  }
}
