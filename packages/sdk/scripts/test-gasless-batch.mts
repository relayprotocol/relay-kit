/**
 * Integration test for executeGaslessBatch
 *
 * Swaps Pudgy Penguins (PENGU) on Base → USDC on Optimism
 *
 * Usage:
 *   PRIVATE_KEY=0x... RELAY_API_KEY=... npx tsx scripts/test-gasless-batch.mts
 */

import { createWalletClient, http, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import {
  createClient,
  getQuote,
  executeGaslessBatch,
  convertViemChainToRelayChain,
  LogLevel
} from '../src/index.js'

const PRIVATE_KEY = process.env.PRIVATE_KEY as Hex | undefined
const RELAY_API_KEY = process.env.RELAY_API_KEY

if (!PRIVATE_KEY) {
  console.error('Missing PRIVATE_KEY env var')
  process.exit(1)
}

if (!RELAY_API_KEY) {
  console.error('Missing RELAY_API_KEY env var')
  process.exit(1)
}

// Pudgy Penguins (PENGU) on Base
const PENGU_BASE = '0x01e6bd233f7021e4f5698a3ae44242b76a246c0a'
// USDC on Optimism
const USDC_OPTIMISM = '0x0b2c639c533813f4aa9d7837caf62653d097ff85'

const account = privateKeyToAccount(PRIVATE_KEY)

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http()
})

createClient({
  baseApiUrl: 'https://api.relay.link',
  apiKey: RELAY_API_KEY,
  source: 'relay.link',
  logLevel: LogLevel.Verbose,
  chains: [convertViemChainToRelayChain(base)]
})

console.log(`\n── Gasless Batch Test ──`)
console.log(`Account: ${account.address}`)
console.log(`Swap:    PENGU (Base) → USDC (Optimism)`)
console.log(`Amount:  1000000000000000000 (1 PENGU)\n`)

// ── 1. Get Quote ─────────────────────────────────────────────────────────────

console.log('→ Getting quote...')

const quote = await getQuote({
  chainId: 8453,
  currency: PENGU_BASE,
  toChainId: 10,
  toCurrency: USDC_OPTIMISM,
  amount: '10000000000000000000000', // 10000 PENGU (18 decimals)
  tradeType: 'EXACT_INPUT',
  user: account.address,
  recipient: account.address,
  options: {
    subsidizeFees: true
  }
})

console.log(`✓ Quote received — ${quote.steps.length} step(s)`)

for (const step of quote.steps) {
  const items = step.items?.length ?? 0
  console.log(`  step: kind=${step.kind}, items=${items}, requestId=${step.requestId ?? 'none'}`)
}

// ── 2. Execute Gasless Batch ─────────────────────────────────────────────────

console.log('\n→ Executing gasless batch...')

const result = await executeGaslessBatch({
  quote,
  walletClient,
  //Subsidize the origin tx fees
  subsidizeFees: true,
  onProgress: (progress) => {
    console.log(`  [progress] ${progress.status}${progress.requestId ? ` (${progress.requestId})` : ''}`)
  }
})

console.log(`\n✓ Done — requestId: ${result.requestId}`)
