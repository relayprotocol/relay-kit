import { afterEach, describe, expect, it, vi } from 'vitest'
import { axios } from './axios'
import { pollUntilHasData, pollUntilOk } from './pollApi'

const request = { url: 'https://api.relay.link/requests/v2' }

describe('pollApi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('pollUntilHasData should resolve to the data found on a later attempt', async () => {
    vi.useFakeTimers()
    vi.spyOn(axios, 'request')
      .mockResolvedValueOnce({ data: { requests: [] } })
      .mockResolvedValueOnce({ data: { requests: [{ id: '0x1' }] } })

    const result = pollUntilHasData(request, (json) => json.requests.length > 0)
    await vi.advanceTimersByTimeAsync(5000)

    await expect(result).resolves.toEqual({ requests: [{ id: '0x1' }] })
  })

  it('pollUntilOk should resolve to true when a later attempt is ok', async () => {
    vi.spyOn(axios, 'request')
      .mockResolvedValueOnce({ status: 202 })
      .mockResolvedValueOnce({ status: 200 })

    await expect(pollUntilOk(request, undefined, 15, 0, 0)).resolves.toBe(true)
  })
})
