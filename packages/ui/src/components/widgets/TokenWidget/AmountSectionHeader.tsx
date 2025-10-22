import { type FC } from 'react'
import { Flex, Text, Box } from '../../primitives/index.js'
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
  <Flex direction="column" css={{ gap: '0', width: '100%' }}>
    <Flex align="center" justify="between" css={{ gap: '2', width: '100%' }}>
      <Text style="subtitle2">{label}</Text>
      <Box css={{ position: 'relative', zIndex: 1 }}>
        <SlippageToleranceConfig
          variant="inline"
          label="Slippage"
          showGearIcon={false}
          currentSlippageTolerance={slippageTolerance}
          setSlippageTolerance={onSlippageToleranceChange ?? (() => {})}
          onAnalyticEvent={onAnalyticEvent}
          onOpenSlippageConfig={onOpenSlippageConfig}
        />
      </Box>
    </Flex>
  </Flex>
)

export default AmountSectionHeader
