import type { NextApiRequest } from 'next'

/**
 * Returns true when the request's Origin (or Referer) host matches the host
 * serving the demo. Non-browser clients can set these headers, so this only
 * blocks cross-site browser use — each proxy also restricts which upstream
 * routes and methods it will forward with its server-side key.
 */
export function isSameSite(req: NextApiRequest): boolean {
  const host = req.headers.host
  const source = req.headers.origin ?? req.headers.referer
  if (!host || !source) return false
  try {
    return new URL(source).host === host
  } catch {
    return false
  }
}
