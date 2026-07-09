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

// Gas-sponsorship logic for quote requests (ported from the demo's secure
// proxy). Eligible token pairs are marked fee-subsidized before forwarding.
const EVM_CHAINS = [137, 42161, 43114, 8453, 10]
const SPONSORED_TOKENS = [
  '792703809:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  '130:0x078d782b760474a361dda0af3839290b0ef57ad6',
  '8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  '43114:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
  '137:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  '42161:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  '10:0x0b2c639c533813f4aa9d7837caf62653d097ff85'
]

function applyGasSponsorship(body: any) {
  const normalize = (chainId?: number, currency?: string) =>
    chainId && EVM_CHAINS.includes(chainId)
      ? `${chainId}:${currency?.toLowerCase()}`
      : `${chainId}:${currency}`

  const from = normalize(body.originChainId, body.originCurrency)
  const to = normalize(body.destinationChainId, body.destinationCurrency)

  const augmented = { ...body, referrer: 'relay.link' }
  if (SPONSORED_TOKENS.includes(from) && SPONSORED_TOKENS.includes(to)) {
    augmented.subsidizeFees = true
    augmented.maxSubsidizationAmount = '1000000000000000000'
  }
  return augmented
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

  const path = rest.join('/')
  const target = new URL(`${upstreamBase}/${path}`)

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

  // Apply gas sponsorship to quote requests before forwarding.
  const body =
    hasBody && path === 'quote/v2' ? applyGasSponsorship(req.body) : req.body

  const upstream = await fetch(target.href, {
    method,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(process.env.NEXT_RELAY_API_KEY
        ? { 'x-api-key': process.env.NEXT_RELAY_API_KEY }
        : {})
    },
    body: hasBody ? JSON.stringify(body) : undefined
  })

  const contentType = upstream.headers.get('content-type') ?? ''
  res.status(upstream.status)

  if (contentType.includes('application/json')) {
    res.json(await upstream.json())
  } else {
    res.send(await upstream.text())
  }
}
