import { cn } from '@/lib/utils.js'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Animated loading skeleton placeholder.
 * aria-hidden="true" since it's purely decorative.
 */
function Skeleton({ className, ...props }: SkeletonProps): React.ReactElement {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      aria-hidden="true"
      {...props}
    />
  )
}

export { Skeleton }
