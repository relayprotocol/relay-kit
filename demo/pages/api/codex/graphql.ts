import type { NextApiRequest, NextApiResponse } from 'next'
import { isSameSite } from '../../../utils/proxyGuard'

// Operations the UI's Codex balance fetcher sends (see
// packages/ui/src/hooks/useCodexBalances.ts). The proxy always forwards its
// own copy of these documents, so callers can't run other queries or
// mutations with the key.
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

const NATIVE_PRICES_QUERY = `query NativePrices($inputs: [GetPriceInput!]!) {
  getTokenPrices(inputs: $inputs) {
    address
    networkId
    priceUsd
  }
}`

const MAX_PAGE_LIMIT = 100
const MAX_PRICE_INPUTS = 10

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

type PriceInput = { address: string; networkId: number }

// Rebuilds the price inputs from known fields only.
function parsePriceInputs(body: any): PriceInput[] | null {
  const inputs = body?.variables?.inputs
  if (
    !Array.isArray(inputs) ||
    inputs.length === 0 ||
    inputs.length > MAX_PRICE_INPUTS
  ) {
    return null
  }
  const parsed: PriceInput[] = []
  for (const input of inputs) {
    if (
      typeof input?.address !== 'string' ||
      !Number.isInteger(input?.networkId)
    ) {
      return null
    }
    parsed.push({ address: input.address, networkId: input.networkId })
  }
  return parsed
}

// Maps the caller's operation to the proxy's own query and validated
// variables, or null if the operation isn't supported.
function buildCodexRequest(
  body: any
): { query: string; variables: Record<string, unknown> } | null {
  const query = typeof body?.query === 'string' ? body.query.trimStart() : ''

  if (query.startsWith('query WalletBalances')) {
    const input = parseBalancesInput(body)
    return input ? { query: BALANCES_QUERY, variables: { input } } : null
  }

  if (query.startsWith('query NativePrices')) {
    const inputs = parsePriceInputs(body)
    return inputs ? { query: NATIVE_PRICES_QUERY, variables: { inputs } } : null
  }

  return null
}

/**
 * Codex GraphQL proxy for the UI's wallet balance lookups. Injects
 * `CODEX_API_KEY` server-side and only forwards same-site `WalletBalances`
 * and `NativePrices` queries.
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

  const codexRequest = buildCodexRequest(req.body)
  if (!codexRequest) {
    res.status(400).json({ message: 'Unsupported operation' })
    return
  }

  const codexResponse = await fetch('https://graph.codex.io/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: CODEX_API_KEY
    },
    body: JSON.stringify(codexRequest)
  })

  const response = await codexResponse.json()
  res.status(codexResponse.status).json(response)
}
