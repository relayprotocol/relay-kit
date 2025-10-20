import { type FC } from 'react'
import Button from './Button.js'
import Text from './Text.js'

interface SlippageButtonProps {
  slippageTolerance?: string
  onOpenSlippageConfig?: () => void
}

export const SlippageButton: FC<SlippageButtonProps> = ({
  slippageTolerance,
  onOpenSlippageConfig
}) => {
  return (
    <Button
      aria-label="Slippage Settings"
      size="none"
      color="ghost"
      css={{
        display: 'flex',
        borderRadius: '8px',
        alignItems: 'center',
        gap: '4px',
        justifyContent: 'center',
        p: '1',
        _hover: {
          backgroundColor: 'gray2'
        },
        backgroundColor: 'gray3',
        padding: '4px 6px'
      }}
      onClick={() => {
        onOpenSlippageConfig?.()
      }}
    >
      <Text style="subtitle3" color="subtle">
        Slippage
      </Text>

      <Text style="subtitle2">{slippageTolerance ?? '2%'}</Text>
    </Button>
  )
}
