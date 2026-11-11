import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { isSameSite } from '../../utils/proxyGuard'

type ResponseData = { signature: null | string } | { message: string }

const MOONPAY_HOSTS = new Set(['buy.moonpay.com', 'buy-sandbox.moonpay.com'])

function isAllowedMoonPayUrl(url: URL): boolean {
  return url.protocol === 'https:' && MOONPAY_HOSTS.has(url.hostname)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  res.setHeader('Cache-Control', 'no-store')

  if (!isSameSite(req)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const { url: _url } = req.query

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

  // Only sign URLs for our own MoonPay account
  if (
    !isAllowedMoonPayUrl(url) ||
    url.searchParams.get('apiKey') !== process.env.NEXT_PUBLIC_MOONPAY_API_KEY
  ) {
    res.status(400).json({ signature: null })
    return
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

  res.status(200).json({ signature })
}
