import { type FC } from 'react'
import { Flex, Text } from '../../primitives/index.js'
import { SlippageButton } from '../../primitives/SlippageButton.js'

type AmountSectionHeaderProps = {
  label: string
  slippageTolerance?: string
  onOpenSlippageConfig?: () => void
}

const AmountSectionHeader: FC<AmountSectionHeaderProps> = ({
  label,
  slippageTolerance,
  onOpenSlippageConfig
}) => (
  <Flex align="center" justify="between" css={{ gap: '2', width: '100%' }}>
    <Text style="subtitle2">{label}</Text>
    <SlippageButton
      slippageTolerance={slippageTolerance}
      onOpenSlippageConfig={onOpenSlippageConfig}
    />
  </Flex>
)

export default AmountSectionHeader
