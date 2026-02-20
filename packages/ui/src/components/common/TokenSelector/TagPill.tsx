import { type FC } from 'react'
import { Text } from '../../primitives/index.js'

type TagPillProps = {
  tag: string
}

export const TagPill: FC<TagPillProps> = ({ tag }) => {
  return (
    <Text
      style="subtitle3"
      className="relay-bg-[var(--relay-colors-primary5)] relay-text-[color:var(--relay-colors-primary11)] relay-px-[6px] relay-py-[4px] relay-rounded-[100px] relay-italic relay-leading-[100%]"
    >
      {tag}
    </Text>
  )
}
