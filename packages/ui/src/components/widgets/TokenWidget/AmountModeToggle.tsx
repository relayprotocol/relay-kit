import {
  type ComponentPropsWithoutRef,
  type FC,
  type ReactNode
} from 'react'
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
      css={{
        gap: '4px',
        _hover: { cursor: 'pointer' }
      }}
      onClick={() => {
        onToggle()
      }}
    >
      <Text {...mergedTextProps}>{children}</Text>
      <Button
        aria-label={buttonAriaLabel}
        size="none"
        color="ghost"
        css={{
          color: 'gray11',
          alignSelf: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '100px',
          padding: '4px',
          backgroundColor: 'gray3'
        }}
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
