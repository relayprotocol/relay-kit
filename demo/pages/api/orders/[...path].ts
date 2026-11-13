import { MAINNET_RELAY_API, TESTNET_RELAY_API } from '@relayprotocol/relay-sdk'
import type { NextApiRequest, NextApiResponse } from 'next'
import { isSameSite } from '../../../utils/proxyGuard'
import { isOrdersAccessAllowed } from '../../../utils/ordersAccess'

const ENV_TO_BASE: Record<string, string> = {
  mainnets: MAINNET_RELAY_API,
  testnets: TESTNET_RELAY_API,
  'mainnets-dev': 'https://api.dev.relay.link'
}

const ORDER_ID = '[^/]+'
const ALLOWED_ROUTES: Record<string, RegExp[]> = {
  GET: [/^orders$/, /^chains$/, /^currencies\/token\/price\/v2$/],
  POST: [
    /^orders$/,
    new RegExp(`^orders\\/${ORDER_ID}\\/signature$`),
    new RegExp(`^orders\\/${ORDER_ID}\\/cancel$`),
    /^currencies\/v2$/
  ]
}

/**
 * Relay API proxy for the limit orders page. Only answers IPs in
 * `VPN_EGRESS_CIDRS`, only forwards the routes in `ALLOWED_ROUTES`, and
 * sends `NEXT_RELAY_ORDERS_API_KEY`, the key of the app with limit orders
 * enabled. Point the SDK's `baseApiUrl` at `/api/orders/<env>`.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isOrdersAccessAllowed(req)) {
    res.status(403).json({ message: 'VPN access required' })
    return
  }

  if (!isSameSite(req)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const [env, ...rest] = ([] as string[]).concat(req.query.path ?? [])
  const upstreamBase = ENV_TO_BASE[env ?? '']
  if (!upstreamBase) {
    res.status(400).json({ message: `Unknown Relay API environment: ${env}` })
    return
  }

  const path = rest.join('/')
  const method = req.method ?? 'GET'
  if (!(ALLOWED_ROUTES[method] ?? []).some((route) => route.test(path))) {
    res.status(404).json({ message: 'Not found' })
    return
  }

  const target = new URL(`${upstreamBase}/${path}`)
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path' || value === undefined) continue
    ;([] as string[])
      .concat(value)
      .forEach((v) => target.searchParams.append(key, v))
  }

  const hasBody = method !== 'GET' && Boolean(req.body)
  const idempotencyKey = req.headers['idempotency-key']
  const upstream = await fetch(target.href, {
    method,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(typeof idempotencyKey === 'string'
        ? { 'Idempotency-Key': idempotencyKey }
        : {}),
      ...(process.env.NEXT_RELAY_ORDERS_API_KEY
        ? { 'x-api-key': process.env.NEXT_RELAY_ORDERS_API_KEY }
        : {})
    },
    body: hasBody ? JSON.stringify(req.body) : undefined
  })

  res.status(upstream.status)
  if (
    (upstream.headers.get('content-type') ?? '').includes('application/json')
  ) {
    res.json(await upstream.json())
  } else {
    res.send(await upstream.text())
  }
}
