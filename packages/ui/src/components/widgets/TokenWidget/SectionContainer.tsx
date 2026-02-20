import { type FC, type PropsWithChildren } from 'react'
import { Flex } from '../../primitives/index.js'
import { cn } from '../../../utils/cn.js'

type SectionContainerProps = PropsWithChildren & {
  className?: string
  id?: string
  isPaymentMethodOpen?: boolean
  paymentMethodMinHeight?: string
}

const SectionContainer: FC<SectionContainerProps> = ({
  children,
  className,
  id,
  isPaymentMethodOpen = false,
  paymentMethodMinHeight = '85vh'
}) => {
  return (
    <Flex
      align="center"
      justify="between"
      id={id}
      className={cn(
        'relay-w-full relay-flex relay-flex-col relay-items-start relay-border-widget-card relay-gap-4',
        'relay-bg-transparent md:relay-bg-[var(--relay-colors-widget-card-background)]',
        'relay-py-3 md:relay-py-4',
        'relay-px-0 md:relay-px-4',
        'relay-rounded-none md:relay-rounded-[var(--relay-radii-widget-card-border-radius)]',
        'md:relay-min-h-[auto]',
        className
      )}
      style={{
        minHeight: isPaymentMethodOpen ? paymentMethodMinHeight : 'auto'
      }}
    >
      {children}
    </Flex>
  )
}

export default SectionContainer
