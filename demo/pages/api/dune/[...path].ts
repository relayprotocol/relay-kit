import type { NextApiRequest, NextApiResponse } from 'next'

const API_MAPPINGS = {
  'api/echo/v1/balances/evm': 'v1/evm/balances',
  'api/echo/beta2/balances/svm': 'beta/svm/balances'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const DUNE_API_KEY = process.env.DUNE_API_KEY
  const allowedDomains = process.env.ALLOWED_API_DOMAINS
    ? process.env.ALLOWED_API_DOMAINS.split(',')
    : []
  const cache = 60
  let origin = req.headers.origin || req.headers.referer || ''

  try {
    origin = new URL(origin).origin
  } catch (e) {}

  if (allowedDomains.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,x-sim-api-key'
    )
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const path = req.url?.replace('/api/dune', '') || ''
  const newPath = Object.entries(API_MAPPINGS).reduce(
    (acc, [old, new_]) => acc.replace(old, new_),
    path
  )

  let modifiedPath = newPath
  const chainIdsMatch = modifiedPath.match(/chain_ids=([^&]*)/)
  if (chainIdsMatch && chainIdsMatch[1].includes('mainnet')) {
    if (!chainIdsMatch[1].includes('747474')) {
      const newChainIds = chainIdsMatch[1] + ',747474'
      modifiedPath = modifiedPath.replace(
        /chain_ids=([^&]*)/,
        `chain_ids=${newChainIds}`
      )
    }
  }

  const url = `https://api.sim.dune.com${modifiedPath}`

  if (!DUNE_API_KEY) {
    res.status(500).json({
      error: 'Server configuration error'
    })
    return
  }

  if (allowedDomains.length > 0 && !allowedDomains.includes(origin)) {
    res.status(403).json({ message: 'Forbidden: Origin not allowed' })
    return
  }

  const duneResponse = await fetch(url, {
    headers: {
      'X-Sim-Api-Key': DUNE_API_KEY
    } as HeadersInit
  })

  const response = await duneResponse.json()

  if (!duneResponse.ok) {
    res.status(duneResponse.status).json(response)
    return
  }

  // Set response cache
  res.setHeader('Cache-Control', `public, s-maxage=${cache}`)
  res.setHeader('CDN-Cache-Control', `public, s-maxage=${cache}`)
  res.setHeader('Vercel-CDN-Cache-Control', `public, s-maxage=${cache}`)

  res.json(response)
}
