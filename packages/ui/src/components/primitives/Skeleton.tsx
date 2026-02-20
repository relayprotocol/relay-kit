import type { FC } from 'react'
import { cn } from '../../utils/cn.js'

type SkeletonProps = {
  className?: string
}

const Skeleton: FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'relay-flex relay-animate-pulse relay-bg-[var(--relay-colors-skeleton-background)] relay-rounded-[8px] relay-w-[100px] relay-h-[12px]',
        className
      )}
    />
  )
}

export default Skeleton
