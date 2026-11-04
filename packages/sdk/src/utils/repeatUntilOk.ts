/**
 * Repeat a function until the function returns true for a maximum set of attempts with a fixed interval
 * @param callback A function that returns true to exit the loop
 * @param maximumAttempts The maximum amount of tries for this poll
 * @param attemptCount The amount of attempts already done by the poll, should be left blank
 * @param pollingInterval The frequency of the loop
 * @returns When it has finished polling
 */
export async function repeatUntilOk(
  callback: () => Promise<boolean>,
  maximumAttempts: number = 15,
  attemptCount: number = 0,
  pollingInterval: number = 5000
): Promise<boolean> {
  if (attemptCount >= maximumAttempts) {
    throw `Failed to get an ok response after ${attemptCount} attempt(s), aborting`
  }

  const response = await callback()

  if (response) {
    return true
  } else {
    await new Promise((resolve) => setTimeout(resolve, pollingInterval))
    attemptCount++
    return repeatUntilOk(
      callback,
      maximumAttempts,
      attemptCount,
      pollingInterval
    )
  }
}
