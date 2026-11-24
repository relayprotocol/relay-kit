import { describe, expect, it } from 'vitest'
import type { Execute } from '@relayprotocol/relay-sdk'
import { formatTransactionSteps } from './steps.js'

type Step = Execute['steps'][number]

const step = (
  id: string,
  kind: 'signature' | 'transaction',
  status: 'complete' | 'incomplete'
): Step =>
  ({
    id,
    kind,
    action: id,
    description: id,
    items: [{ status, data: {} }]
  }) as unknown as Step

const format = (steps: Step[]) =>
  formatTransactionSteps({
    steps,
    fromChain: { id: 8453, displayName: 'Base' } as any,
    toChain: { id: 10, displayName: 'Optimism' } as any,
    operation: 'bridge'
  }).formattedSteps

describe('formatTransactionSteps', () => {
  it('keeps send incomplete until every authorize signature and the deposit are done', () => {
    const sendAfterFirstSignature = format([
      step('authorize', 'signature', 'complete'),
      step('authorize', 'signature', 'incomplete'),
      step('deposit', 'transaction', 'incomplete')
    ]).find((s) => s.id === 'send-cross-chain')

    expect(sendAfterFirstSignature?.isCompleted).toBe(false)
    expect(sendAfterFirstSignature?.isActive).toBe(true)

    const sendAfterBothSignatures = format([
      step('authorize', 'signature', 'complete'),
      step('authorize', 'signature', 'complete'),
      step('deposit', 'transaction', 'incomplete')
    ]).find((s) => s.id === 'send-cross-chain')

    expect(sendAfterBothSignatures?.isCompleted).toBe(false)
  })

  it('keeps approve incomplete until every approve transaction is done', () => {
    const formatted = format([
      step('approve', 'transaction', 'complete'),
      step('approve', 'transaction', 'incomplete'),
      step('deposit', 'transaction', 'incomplete')
    ])

    const approve = formatted.find((s) => s.id === 'approve-cross-chain')
    const send = formatted.find((s) => s.id === 'send-cross-chain')
    expect(approve?.isCompleted).toBe(false)
    expect(approve?.isActive).toBe(true)
    expect(send?.isActive).toBe(false)
  })
})
