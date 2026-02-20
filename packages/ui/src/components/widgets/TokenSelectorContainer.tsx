import { type FC, type PropsWithChildren } from 'react'
import { Flex } from '../primitives/index.js'
import { cn } from '../../utils/cn.js'

const TokenSelectorContainer: FC<
  PropsWithChildren & { className?: string; id?: string }
> = ({ children, className, id }) => {
  return (
    <Flex
      align="center"
      justify="between"
      id={id}
      className={cn(
        'relay-w-full relay-flex relay-flex-col relay-items-start relay-bg-[var(--relay-colors-widget-card-background)] relay-border-widget-card relay-gap-3 relay-p-3 relay-rounded-[var(--relay-radii-widget-card-border-radius)]',
        className
      )}
    >
      {children}
    </Flex>
  )
}

export default TokenSelectorContainer
