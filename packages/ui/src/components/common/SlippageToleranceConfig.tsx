import type { FC, ChangeEvent, Dispatch, SetStateAction } from 'react'
import { useState, useEffect, useRef } from 'react'
import { Dropdown } from '../primitives/Dropdown.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { Button, Flex, Input, Text, Box } from '../primitives/index.js'
import Tooltip from '../primitives/Tooltip.js'
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent
} from '../primitives/Tabs.js'
import {
  getSlippageRating,
  ratingToColor,
  type SlippageToleranceMode
} from '../../utils/slippage.js'
import { EventNames } from '../../constants/events.js'
import { useDebounceValue } from 'usehooks-ts'
import useFallbackState from '../../hooks/useFallbackState.js'

type SlippageToleranceConfigProps = {
  open?: boolean
  setOpen?: (open: boolean) => void
  setSlippageTolerance: (value: string | undefined) => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
}

export const SlippageToleranceConfig: FC<SlippageToleranceConfigProps> = ({
  open: _open,
  setOpen: _setOpen,
  setSlippageTolerance: externalSetValue,
  onAnalyticEvent
}) => {
  const [displayValue, setDisplayValue] = useState<string | undefined>(
    undefined
  )
  const [debouncedDisplayValue] = useDebounceValue(displayValue, 500)

  const bpsValue = debouncedDisplayValue
    ? Number((Number(debouncedDisplayValue) * 100).toFixed(2)).toString()
    : undefined

  useEffect(() => {
    externalSetValue(bpsValue)
  }, [bpsValue, externalSetValue])

  const [mode, setMode] = useState<SlippageToleranceMode>('Auto')
  const [open, setOpen] = useFallbackState(
    _open !== undefined ? _open : false,
    _setOpen
      ? [_open ?? false, _setOpen as Dispatch<SetStateAction<boolean>>]
      : undefined
  )

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && mode === 'Custom') {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }, [open, mode])

  const slippageRating = displayValue
    ? getSlippageRating(displayValue)
    : undefined
  const slippageRatingColor = slippageRating
    ? ratingToColor[slippageRating]
    : undefined

  const handleInputChange = (value: string) => {
    // Remove non-numeric characters except decimal point
    const sanitizedValue = value.replace(/[^0-9.]/g, '')

    // Handle empty input
    if (sanitizedValue === '') {
      setDisplayValue(undefined)
      return
    }

    // Handle single decimal point input
    if (sanitizedValue === '.') {
      setDisplayValue('0.')
      return
    }

    // Validate format (numbers with up to 2 decimal places)
    if (!/^[0-9]*\.?[0-9]{0,2}$/.test(sanitizedValue)) {
      return
    }

    // Prevent multiple leading zeros unless followed by a decimal
    if (
      sanitizedValue.startsWith('0') &&
      sanitizedValue.length > 1 &&
      sanitizedValue[1] !== '.'
    ) {
      return
    }

    const numValue = parseFloat(sanitizedValue)
    if (!isNaN(numValue)) {
      if (numValue > 100) {
        setDisplayValue('100')
        return
      }
    }

    setDisplayValue(sanitizedValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
    }
  }

  const handleClose = () => {
    const value = parseFloat(displayValue ?? '0')
    const isAuto =
      mode === 'Auto' ||
      displayValue === undefined ||
      isNaN(value) ||
      value < 0.01

    if (isAuto) {
      setDisplayValue(undefined)
    }

    onAnalyticEvent?.(EventNames.SWAP_SLIPPAGE_TOLERANCE_SET, {
      value: isAuto ? 'auto' : displayValue
    })
  }

  return (
    <div className="relay-kit-reset">
      <Dropdown
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) {
            handleClose()
          }
        }}
        trigger={
          <Button
            aria-label="Slippage Tolerance Configuration"
            color="ghost"
            size="none"
            css={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1',
              bg: 'subtle-background-color',
              color: slippageRatingColor ?? 'gray9',
              p: '2',
              borderRadius: 12,
              border: 'widget-card-border',
              height: '36px',
              px: '10px'
            }}
          >
            {open === false && displayValue && (
              <Text style="subtitle2" css={{ color: slippageRatingColor }}>
                {displayValue}%
              </Text>
            )}
            <FontAwesomeIcon icon={faGear} />
          </Button>
        }
        contentProps={{
          align: 'end',
          sideOffset: 5,
          css: { maxWidth: 188, mx: 0 },
          avoidCollisions: false,
          onCloseAutoFocus: (e) => {
            e.preventDefault()
          }
        }}
      >
        <Flex
          direction="column"
          css={{ width: '100%', gap: '2', maxWidth: 188 }}
        >
          <Flex direction="row" css={{ gap: '1', alignItems: 'center' }}>
            <Text style="subtitle3">Max Slippage</Text>
            <Tooltip
              content={
                <Text
                  style="tiny"
                  css={{ display: 'inline-block', maxWidth: 190 }}
                >
                  If the price exceeds the maximum slippage percentage, the
                  transaction will revert.
                </Text>
              }
            >
              <Box css={{ color: 'gray8' }}>
                <FontAwesomeIcon icon={faInfoCircle} width={14} height={14} />
              </Box>
            </Tooltip>
          </Flex>

          <TabsRoot
            value={mode}
            onValueChange={(value) => {
              setMode(value as SlippageToleranceMode)
              if (value === 'Auto') {
                setDisplayValue(undefined)
              }
            }}
            css={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: '2'
            }}
          >
            <TabsList css={{ width: '100%' }}>
              <TabsTrigger value="Auto" css={{ width: '50%' }}>
                Auto
              </TabsTrigger>
              <TabsTrigger value="Custom" css={{ width: '50%' }}>
                Custom
              </TabsTrigger>
            </TabsList>

            <TabsContent value="Auto" css={{ width: '100%' }}>
              <Text style="body3" color="subtle" css={{ lineHeight: '14px' }}>
                We'll set the slippage automatically to minimize the failure
                rate.
              </Text>
            </TabsContent>

            <TabsContent
              value="Custom"
              css={{
                display: 'flex',
                width: '100%',
                overflow: 'hidden',
                flexDirection: 'column',
                gap: '1'
              }}
            >
              <Flex
                css={{ display: 'flex', width: '100%', position: 'relative' }}
              >
                <Input
                  ref={inputRef}
                  value={displayValue || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleInputChange(e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  onBlur={handleClose}
                  placeholder="2"
                  css={{
                    height: '36px',
                    pr: '28px !important',
                    border: 'none',
                    textAlign: 'right',
                    width: '100%',
                    color: slippageRatingColor
                  }}
                />
                <Box
                  css={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: slippageRatingColor
                  }}
                >
                  %
                </Box>
              </Flex>
              {slippageRating === 'very-high' ? (
                <Text style="body3" css={{ color: 'red11' }}>
                  Very high slippage
                </Text>
              ) : null}
              {slippageRating === 'high' ? (
                <Text style="body3" css={{ color: 'amber11' }}>
                  High slippage
                </Text>
              ) : null}
            </TabsContent>
          </TabsRoot>
        </Flex>
      </Dropdown>
    </div>
  )
}
