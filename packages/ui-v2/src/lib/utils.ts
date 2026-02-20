import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind classes safely, resolving conflicts.
 * Use this instead of string concatenation for all className props.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Returns Tailwind animation class names only if the user hasn't requested
 * reduced motion. Uses Tailwind's motion-safe: prefix.
 */
export function motionSafe(className: string): string {
  return `motion-safe:${className}`
}
