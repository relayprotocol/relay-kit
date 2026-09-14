import type { Execute } from '../types/index.js'

/**
 * True when the step is filled by the solver rather than settled atomically by
 * the user's own transaction.
 *
 * The API emits `deposit` whenever the request is routed as an intent — every
 * cross-chain route, deposit-address routes, forced solver execution, and
 * same-chain routes with no on-chain aggregator to swap through (Tron). Origin
 * and destination chain ids are not a reliable signal: those same-chain intents
 * report matching ids while still requiring a separate fill.
 *
 * Atomic steps (`swap`, `send`) complete with the origin transaction and must
 * not be made to wait on the status API.
 */
export const isSolverFilledStep = (step: Execute['steps'][0]): boolean =>
  step.id === 'deposit'
