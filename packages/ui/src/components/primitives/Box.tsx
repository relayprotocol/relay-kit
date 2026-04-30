import type { FC, PropsWithChildren } from 'react'
import { cn } from '../../utils/cn.js'

const Box: FC<
  { className?: string; id?: string } & PropsWithChildren
> = ({ className, children, id }) => {
  return (
    <div className={cn(className)} id={id}>
      {children}
    </div>
  )
}

export default Box
