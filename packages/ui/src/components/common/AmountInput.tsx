import type { ComponentPropsWithoutRef, FC } from 'react'
import { Input } from '../primitives/index.js'
import { cn } from '../../utils/cn.js'

type Props = {
  value: string
  setValue: (value: string) => void
  prefixSymbol?: string
} & ComponentPropsWithoutRef<typeof Input>

const AmountInput: FC<Props> = ({
  value,
  setValue,
  prefixSymbol,
  ...inputProps
}) => {
  return (
    <Input
      {...inputProps}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      pattern="^[0-9]+(\.[0-9]*)?$"
      ellipsify
      size="large"
      className={cn(
        'ph-no-capture',
        'relay-w-full relay-bg-none relay-bg-transparent relay-font-semibold relay-text-[32px]',
        '!relay-px-0 relay-py-1',
        'focus:relay-shadow-none focus:relay-outline-none',
        'placeholder:relay-text-[color:var(--relay-colors-gray12)]',
        inputProps.className
      )}
      placeholder={inputProps.placeholder ?? '0'}
      value={prefixSymbol ? `${prefixSymbol}${value}` : value}
      onChange={
        inputProps.onChange
          ? inputProps.onChange
          : (e) => {
              let newNumericValue = (e.target as HTMLInputElement).value

              if (prefixSymbol) {
                if (newNumericValue.startsWith(prefixSymbol)) {
                  newNumericValue = newNumericValue.substring(
                    prefixSymbol.length
                  )
                }
                // If input is empty or doesn't start with prefix, treat as new numeric value
                // The prefix will be re-applied by the `value` prop on re-render
              }

              // Validate and set the numeric part
              const regex = /^[0-9]+(\.[0-9]*)?$/
              if (newNumericValue === '.' || newNumericValue.includes(',')) {
                setValue('0.')
              } else if (
                regex.test(newNumericValue) ||
                newNumericValue === ''
              ) {
                setValue(newNumericValue)
              }
            }
      }
    />
  )
}

export default AmountInput
