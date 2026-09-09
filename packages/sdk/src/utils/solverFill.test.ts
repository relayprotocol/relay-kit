import { describe, it, expect } from 'vitest'
import { isSolverFilledStep } from './solverFill'
import type { Execute } from '../types'

const step = (id: string) => ({ id }) as Execute['steps'][0]

describe('isSolverFilledStep', () => {
  it('Should treat deposit steps as solver filled.', () => {
    expect(isSolverFilledStep(step('deposit'))).toBe(true)
  })

  it('Should treat every other transaction step as atomic.', () => {
    for (const id of ['swap', 'send', 'approve', 'approval']) {
      expect(isSolverFilledStep(step(id))).toBe(false)
    }
  })
})
