import type { ComponentPropsWithoutRef, FC } from 'react'
import { Input } from '../primitives/index.js'

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
      className="ph-no-capture"
      css={{
        width: '100%',
        background: 'none',
        backgroundColor: 'transparent',
        fontWeight: '600',
        fontSize: 32,
        px: '0 !important',
        py: '1',
        _focus: {
          boxShadow: 'none',
          outline: 'none'
        },
        _placeholder: {
          color: 'gray12'
        },
        ...inputProps.css
      }}
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

              const cleanValue = newNumericValue.replace(/,/g, '')

              // Validate and set the numeric part
              const regex = /^[0-9]+(\.[0-9]*)?$/
              if (
                cleanValue === '.' ||
                (newNumericValue.includes(',') && cleanValue === '')
              ) {
                setValue('0.')
              } else if (regex.test(cleanValue) || cleanValue === '') {
                setValue(cleanValue)
              }
            }
      }
    />
  )
}

export default AmountInput
