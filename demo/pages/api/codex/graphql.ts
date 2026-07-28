import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const CODEX_API_KEY = process.env.CODEX_API_KEY
  const allowedDomains = process.env.ALLOWED_API_DOMAINS
    ? process.env.ALLOWED_API_DOMAINS.split(',')
    : []
  let origin = req.headers.origin || req.headers.referer || ''

  try {
    origin = new URL(origin).origin
  } catch (e) {}

  if (allowedDomains.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  if (!CODEX_API_KEY) {
    res.status(500).json({
      error: 'Server configuration error'
    })
    return
  }

  if (allowedDomains.length > 0 && !allowedDomains.includes(origin)) {
    res.status(403).json({ message: 'Forbidden: Origin not allowed' })
    return
  }

  const codexResponse = await fetch('https://graph.codex.io/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: CODEX_API_KEY
    },
    body: JSON.stringify(req.body)
  })

  const response = await codexResponse.json()

  if (!codexResponse.ok) {
    res.status(codexResponse.status).json(response)
    return
  }

  res.json(response)
}
