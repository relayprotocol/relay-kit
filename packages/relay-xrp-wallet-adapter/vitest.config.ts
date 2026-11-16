import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Keep a tight default timeout so the adapter's internal fake-timer
    // poller tests can't silently hang; individual tests can opt in to longer.
    testTimeout: 10_000
  }
})
