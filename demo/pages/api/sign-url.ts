import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

type ResponseData = {
  signature: null | string
}

const MOONPAY_HOSTS = new Set(['buy.moonpay.com', 'buy-sandbox.moonpay.com'])

function isAllowedMoonPayUrl(url: URL): boolean {
  return url.protocol === 'https:' && MOONPAY_HOSTS.has(url.hostname)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { url: _url, ...query } = req.query

  if (typeof _url !== 'string') {
    res.status(400).json({ signature: null })
    return
  }

  let url: URL
  try {
    url = new URL(_url)
  } catch {
    res.status(400).json({ signature: null })
    return
  }

  if (!isAllowedMoonPayUrl(url)) {
    res.status(400).json({ signature: null })
    return
  }

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      url.searchParams.set(key, value)
    }
  }

  const moonPaySecret = process.env.NEXT_MOONPAY_SECRET
  if (!moonPaySecret) {
    res.status(500).json({ signature: null })
    return
  }

  const signature = crypto
    .createHmac('sha256', moonPaySecret)
    .update(url.search)
    .digest('base64')

  res
    .status(200)
    .setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=60'
    )
    .json({ signature })
}
