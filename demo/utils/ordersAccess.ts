import type { IncomingMessage } from 'http'

const normalizeIp = (ip: string) => ip.trim().replace(/^::ffff:/, '')

type ParsedIp = { bits: 32 | 128; value: bigint }

const parseIp = (ip: string): ParsedIp | undefined => {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const octets = ip.split('.').map(Number)
    if (octets.some((octet) => octet > 255)) return undefined
    return {
      bits: 32,
      value: octets.reduce((acc, octet) => (acc << 8n) + BigInt(octet), 0n)
    }
  }
  const halves = ip.split('::')
  if (!ip.includes(':') || halves.length > 2) return undefined
  const [head, tail] = halves.map((half) => (half ? half.split(':') : []))
  const zeros = 8 - head.length - (tail?.length ?? 0)
  if (tail ? zeros < 1 : zeros !== 0) return undefined
  const groups = [
    ...head,
    ...Array(tail ? zeros : 0).fill('0'),
    ...(tail ?? [])
  ]
  if (!groups.every((group) => /^[0-9a-f]{1,4}$/i.test(group))) return undefined
  return {
    bits: 128,
    value: groups.reduce(
      (acc, group) => (acc << 16n) + BigInt(parseInt(group, 16)),
      0n
    )
  }
}

/** Whether `ip` is in `range`, a CIDR range or a single IP */
const inRange = (ip: ParsedIp, range: string) => {
  const [address, prefix] = range.trim().split('/')
  const network = parseIp(address)
  if (!network || network.bits !== ip.bits) return false
  if (prefix !== undefined && !/^\d+$/.test(prefix)) return false
  const length = prefix === undefined ? network.bits : Number(prefix)
  if (length > network.bits) return false
  const shift = BigInt(network.bits - length)
  return network.value >> shift === ip.value >> shift
}

/**
 * The client's IP: the first `x-forwarded-for` hop, then `x-real-ip`, then the
 * socket address. Vercel sets both headers itself; behind a host that passes
 * client-supplied values through, they can be spoofed.
 */
export function getClientIp(req: IncomingMessage): string | undefined {
  const forwarded = req.headers['x-forwarded-for']
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(',')[0]
    ?.trim()
  const realIp = req.headers['x-real-ip']
  const ip =
    first ||
    (Array.isArray(realIp) ? realIp[0] : realIp) ||
    req.socket?.remoteAddress
  return ip ? normalizeIp(ip) : undefined
}

/**
 * Whether the request comes from the VPN: its IP is in `VPN_EGRESS_CIDRS`, a
 * comma-separated list of CIDR ranges or single IPs (IPv4 or IPv6). An unset
 * or empty list denies every request.
 */
export function isOrdersAccessAllowed(req: IncomingMessage): boolean {
  const clientIp = getClientIp(req)
  const ip = clientIp ? parseIp(clientIp) : undefined
  return Boolean(
    ip &&
      (process.env.VPN_EGRESS_CIDRS ?? '')
        .split(',')
        .some((range) => inRange(ip, range))
  )
}
