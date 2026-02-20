import { type ComponentPropsWithoutRef, type FC, type ReactNode } from 'react'
import { Flex, Text, Button } from '../../primitives/index.js'
import { SwitchIcon } from '../../../icons/index.js'

type TextProps = Omit<ComponentPropsWithoutRef<typeof Text>, 'children'>

type AmountModeToggleProps = {
  children: ReactNode
  onToggle: () => void
  textProps?: TextProps
  buttonAriaLabel?: string
}

const AmountModeToggle: FC<AmountModeToggleProps> = ({
  children,
  onToggle,
  textProps,
  buttonAriaLabel = 'Switch Input Mode'
}) => {
  const mergedTextProps: TextProps = {
    style: 'subtitle3',
    color: 'subtleSecondary',
    ...textProps
  }

  return (
    <Flex
      align="center"
      className="relay-gap-[8px] hover:relay-cursor-pointer"
      onClick={() => {
        onToggle()
      }}
    >
      <Text {...mergedTextProps}>{children}</Text>
      <Button
        aria-label={buttonAriaLabel}
        size="none"
        color="ghost"
        className="relay-text-[color:var(--relay-colors-gray11)] relay-self-center relay-justify-center relay-w-[20px] relay-h-[20px] relay-rounded-[100px] relay-p-[4px] relay-bg-[var(--relay-colors-gray3)]"
        onClick={() => {
          onToggle()
        }}
      >
        <SwitchIcon width={16} height={10} />
      </Button>
    </Flex>
  )
}

export default AmountModeToggle
