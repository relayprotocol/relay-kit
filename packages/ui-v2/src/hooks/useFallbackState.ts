import { type Dispatch, type SetStateAction, useState } from 'react'

type UseStateType<S> = [S, Dispatch<SetStateAction<S>>]

/**
 * Controlled/uncontrolled state helper.
 *
 * If an external `state` tuple is provided, it is returned as-is (controlled mode).
 * If no external state is provided, internal useState is used (uncontrolled mode).
 *
 * This pattern enables components to work both ways:
 * - Controlled: parent owns the state
 * - Uncontrolled: component manages its own state
 *
 * @example
 * // Uncontrolled
 * const [value, setValue] = useFallbackState(undefined)
 *
 * // Controlled
 * const [value, setValue] = useFallbackState(undefined, [externalValue, setExternalValue])
 */
export function useFallbackState<T>(
  defaultValue: T,
  state?: UseStateType<T>
): UseStateType<T> {
  // Always call useState unconditionally (rules of hooks)
  const internalState = useState<T>(defaultValue)

  if (state) {
    return state
  }

  return internalState
}
