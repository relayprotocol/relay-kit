import { useMemo, useRef, useState } from 'react'
import {
  type DebouncedState,
  useDebounceValue,
  useDebounceCallback
} from 'usehooks-ts'

type Params<T> = Parameters<typeof useDebounceValue>

/**
 * Combines useState + debounced state into a single hook.
 *
 * Returns both the immediate `value` (updates synchronously on every keystroke)
 * and the `debouncedValue` (updates only after `delay` ms of inactivity).
 *
 * Use this for search inputs and amount fields where you want:
 * - Immediate UI feedback (via `value`)
 * - Throttled API calls (via `debouncedValue`)
 */
export function useDebounceState<T>(
  initialValue: Params<T>[0],
  delay: Params<T>[1],
  options?: Params<T>[2]
): {
  value: T
  debouncedValue: T
  setValue: (value: T) => void
  setDebouncedValue: (value: T) => void
  debouncedControls: DebouncedState<(value: T) => void>
} {
  const memoOptions = useMemo(() => options, [options])
  const eq = memoOptions?.equalityFn ?? ((left: T, right: T) => left === right)
  const unwrappedInitialValue =
    initialValue instanceof Function ? initialValue() : (initialValue as T)
  const [debouncedValue, setDebouncedValue] = useState<T>(unwrappedInitialValue)
  const [value, setValue] = useState<T>(unwrappedInitialValue)
  const previousValueRef = useRef<T | undefined>(unwrappedInitialValue)

  const updateDebouncedValue = useDebounceCallback(
    setDebouncedValue,
    delay,
    memoOptions
  )

  // Sync debounced value when initial value changes externally
  if (!eq(previousValueRef.current as T, unwrappedInitialValue)) {
    updateDebouncedValue(unwrappedInitialValue)
    previousValueRef.current = unwrappedInitialValue
  }

  return {
    value,
    debouncedValue,
    setValue: (newValue: T) => {
      updateDebouncedValue.cancel()
      setValue(newValue)
      updateDebouncedValue(newValue)
    },
    setDebouncedValue: (newValue: T) => {
      updateDebouncedValue.cancel()
      updateDebouncedValue(newValue)
    },
    debouncedControls: updateDebouncedValue
  }
}
