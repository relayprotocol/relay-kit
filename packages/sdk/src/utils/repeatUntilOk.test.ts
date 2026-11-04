import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { repeatUntilOk } from './repeatUntilOk.js'

describe('repeatUntilOk', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true without scheduling a retry when the first attempt succeeds', async () => {
    const callback = vi.fn().mockResolvedValue(true)

    await expect(repeatUntilOk(callback)).resolves.toBe(true)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([2, 4])(
    'returns true when attempt %i succeeds',
    async (successfulAttempt) => {
      let attempts = 0
      const callback = vi.fn(async () => ++attempts === successfulAttempt)

      const result = repeatUntilOk(callback, 4, 0, 50)
      await vi.runAllTimersAsync()

      await expect(result).resolves.toBe(true)
      expect(callback).toHaveBeenCalledTimes(successfulAttempt)
      expect(Date.now()).toBe((successfulAttempt - 1) * 50)
      expect(vi.getTimerCount()).toBe(0)
    }
  )

  it('keeps the default polling interval before a successful retry', async () => {
    const callback = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true)

    const result = repeatUntilOk(callback)
    await vi.runAllTimersAsync()

    await expect(result).resolves.toBe(true)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(Date.now()).toBe(5000)
  })

  it('preserves the failure and callback count when attempts are exhausted', async () => {
    const callback = vi.fn().mockResolvedValue(false)

    const result = repeatUntilOk(callback, 3, 0, 50)
    const rejection = expect(result).rejects.toBe(
      'Failed to get an ok response after 3 attempt(s), aborting'
    )
    await vi.runAllTimersAsync()
    await rejection

    expect(callback).toHaveBeenCalledTimes(3)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not call the callback when no attempts remain', async () => {
    const callback = vi.fn().mockResolvedValue(true)

    await expect(repeatUntilOk(callback, 3, 3)).rejects.toBe(
      'Failed to get an ok response after 3 attempt(s), aborting'
    )

    expect(callback).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('propagates a callback rejection after a retry', async () => {
    const error = new Error('callback failed')
    const callback = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(error)

    const result = repeatUntilOk(callback, 3, 0, 50)
    const rejection = expect(result).rejects.toBe(error)
    await vi.runAllTimersAsync()
    await rejection

    expect(callback).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })
})
