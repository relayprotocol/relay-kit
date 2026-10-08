import type { NextApiRequest, NextApiResponse } from 'next'
import { isSameSite } from '../../../utils/proxyGuard'

// The only operation the UI's Codex balance fetcher sends (see
// packages/ui/src/hooks/useCodexBalances.ts). The proxy always forwards this
// document, so callers can't run other queries or mutations with the key.
const BALANCES_QUERY = `query WalletBalances($input: BalancesInput!) {
  balances(input: $input) {
    cursor
    items {
      balance
      balanceUsd
      tokenPriceUsd
      liquidityUsd
      tokenAddress
      networkId
      token {
        symbol
        decimals
        isScam
      }
    }
  }
}`

const MAX_PAGE_LIMIT = 100

type BalancesInput = {
  walletAddress: string
  networks?: number[]
  cursor?: string
  limit?: number
  includeNative?: boolean
  removeScams?: boolean
  sortBy?: string
  sortDirection?: string
}

// Rebuilds the balances input from known fields only.
function parseBalancesInput(body: any): BalancesInput | null {
  const input = body?.variables?.input
  if (!input || typeof input.walletAddress !== 'string') return null

  const parsed: BalancesInput = { walletAddress: input.walletAddress }
  if (Array.isArray(input.networks)) {
    if (!input.networks.every((n: unknown) => Number.isInteger(n))) return null
    parsed.networks = input.networks
  }
  if (typeof input.cursor === 'string') parsed.cursor = input.cursor
  if (Number.isInteger(input.limit)) {
    parsed.limit = Math.min(Math.max(input.limit, 1), MAX_PAGE_LIMIT)
  }
  if (typeof input.includeNative === 'boolean') {
    parsed.includeNative = input.includeNative
  }
  if (typeof input.removeScams === 'boolean') {
    parsed.removeScams = input.removeScams
  }
  if (typeof input.sortBy === 'string') parsed.sortBy = input.sortBy
  if (typeof input.sortDirection === 'string') {
    parsed.sortDirection = input.sortDirection
  }
  return parsed
}

/**
 * Codex GraphQL proxy for the UI's wallet balance lookups. Injects
 * `CODEX_API_KEY` server-side and only forwards same-site `WalletBalances`
 * queries.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  if (!isSameSite(req)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const CODEX_API_KEY = process.env.CODEX_API_KEY
  if (!CODEX_API_KEY) {
    res.status(500).json({ error: 'Server configuration error' })
    return
  }

  const query = typeof req.body?.query === 'string' ? req.body.query : ''
  const input = parseBalancesInput(req.body)
  if (!query.trimStart().startsWith('query WalletBalances') || !input) {
    res.status(400).json({ message: 'Unsupported operation' })
    return
  }

  const codexResponse = await fetch('https://graph.codex.io/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: CODEX_API_KEY
    },
    body: JSON.stringify({ query: BALANCES_QUERY, variables: { input } })
  })

  const response = await codexResponse.json()
  res.status(codexResponse.status).json(response)
}
