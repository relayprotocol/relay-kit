import type { Execute, ExecuteStep, FlatExecuteStep } from '../types/index.js'

/**
 * Put quote/v3 and Orders API steps, which carry `status`, `data` and `check`
 * on the step, into the `items` shape that execution runs on. Legacy steps
 * with `items` are returned unchanged. A flat step without a `requestId` takes
 * the response's top-level one.
 */
export function normalizeSteps(
  steps: (ExecuteStep | FlatExecuteStep)[],
  requestId?: string
): Execute['steps'] {
  return steps.map((step) => {
    if ('items' in step && step.items) {
      return step
    }
    const { status, data, check, ...rest } = step as FlatExecuteStep
    return {
      ...rest,
      ...(requestId && !rest.requestId ? { requestId } : {}),
      items: [{ status, data, check }]
    } as ExecuteStep
  })
}
