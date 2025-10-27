import { type FC } from 'react'
import { Flex, Text } from '../../primitives/index.js'
import { SlippageToleranceConfig } from '../../common/SlippageToleranceConfig.js'

type AmountSectionHeaderProps = {
  label: string
  slippageTolerance?: string
  onSlippageToleranceChange?: (value: string | undefined) => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onOpenSlippageConfig?: () => void
}

const AmountSectionHeader: FC<AmountSectionHeaderProps> = ({
  label,
  slippageTolerance,
  onSlippageToleranceChange,
  onAnalyticEvent,
  onOpenSlippageConfig
}) => (
  <Flex align="center" justify="between" css={{ gap: '2', width: '100%' }}>
    <Text style="subtitle2">{label}</Text>
    <SlippageToleranceConfig
      label="Slippage"
      showGearIcon={false}
      showLabel={true}
      currentSlippageTolerance={slippageTolerance}
      setSlippageTolerance={onSlippageToleranceChange ?? (() => {})}
      onAnalyticEvent={onAnalyticEvent}
      onOpenSlippageConfig={onOpenSlippageConfig}
    />
  </Flex>
)

export default AmountSectionHeader
