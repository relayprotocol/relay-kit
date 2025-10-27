import type { NextApiRequest, NextApiResponse } from 'next'

// Map to override old API paths to new SIM API paths
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

  // CORS: If the origin is allowed, set CORS headers
  if (allowedDomains.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,x-sim-api-key'
    )
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const path = req.url?.replace('/api/dune/', '') || ''
  const newPath = Object.entries(API_MAPPINGS).reduce(
    (acc, [old, new_]) => acc.replace(old, new_),
    path
  )

  let modifiedPath = newPath
  const chainIdsMatch = modifiedPath.match(/chain_ids=([^&]*)/)
  if (chainIdsMatch && chainIdsMatch[1].includes('mainnet')) {
    // Only append if not already present
    if (!chainIdsMatch[1].includes('747474')) {
      const newChainIds = chainIdsMatch[1] + ',747474'
      modifiedPath = modifiedPath.replace(
        /chain_ids=([^&]*)/,
        `chain_ids=${newChainIds}`
      )
    }
  }

  const url = `https://api.sim.dune.com${modifiedPath}`

  if (
    !(allowedDomains.includes(origin) && DUNE_API_KEY) &&
    allowedDomains.length > 0
  ) {
    res.status(400).json({ message: 'Bad Request!' })
    return
  }

  const duneResponse = await fetch(url, {
    headers: {
      'X-Sim-Api-Key': DUNE_API_KEY!
    } as HeadersInit
  })

  const response = await duneResponse.json()

  // Set response cache
  res.setHeader('Cache-Control', `public, s-maxage=${cache}`)
  res.setHeader('CDN-Cache-Control', `public, s-maxage=${cache}`)
  res.setHeader('Vercel-CDN-Cache-Control', `public, s-maxage=${cache}`)

  res.json(response)
}
