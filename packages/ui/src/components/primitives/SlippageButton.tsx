import { type FC } from 'react'
import Button from './Button.js'
import Text from './Text.js'

interface SlippageButtonProps {
  slippageTolerance?: string
  onOpenSlippageConfig?: () => void
}

const convertBpsToPercent = (bps?: string) => {
  if (bps === undefined) return undefined
  const numeric = Number(bps)
  if (!Number.isFinite(numeric)) return undefined

  const percent = numeric / 100
  if (!Number.isFinite(percent)) return undefined

  const formatted = percent.toFixed(percent % 1 === 0 ? 0 : 2)
  return formatted.replace(/\.0+$/, '').replace(/\.00$/, '')
}

export const SlippageButton: FC<SlippageButtonProps> = ({
  slippageTolerance,
  onOpenSlippageConfig
}) => {
  const resolvedValue = convertBpsToPercent(slippageTolerance)
  const displayValue = resolvedValue ? `${resolvedValue}%` : 'Auto'

  return (
    <Button
      aria-label="Slippage Settings"
      size="none"
      color="ghost"
      className="relay-flex relay-rounded-[8px] relay-items-center relay-gap-[4px] relay-justify-center relay-p-1 hover:relay-bg-[var(--relay-colors-gray2)] relay-bg-[var(--relay-colors-gray3)] relay-px-[6px] relay-py-[4px]"
      onClick={() => {
        onOpenSlippageConfig?.()
      }}
    >
      <Text style="subtitle3" color="subtle">
        Slippage
      </Text>

      <Text style="subtitle2">{displayValue}</Text>
    </Button>
  )
}
