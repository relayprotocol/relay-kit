import type {
  FC,
  ChangeEvent,
  Dispatch,
  SetStateAction,
  KeyboardEvent
} from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  currentSlippageTolerance?: string | undefined
  variant?: 'dropdown' | 'inline'
  label?: string
  onOpenSlippageConfig?: () => void
  showGearIcon?: boolean
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

export const SlippageToleranceConfig: FC<SlippageToleranceConfigProps> = ({
  open: _open,
  setOpen: _setOpen,
  setSlippageTolerance: externalSetValue,
  onAnalyticEvent,
  currentSlippageTolerance,
  variant = 'dropdown',
  label = 'Slippage',
  onOpenSlippageConfig,
  showGearIcon = true
}) => {
  const [displayValue, setDisplayValue] = useState<string | undefined>(() =>
    convertBpsToPercent(currentSlippageTolerance)
  )
  const [debouncedDisplayValue] = useDebounceValue(displayValue, 500)

  const bpsValue = debouncedDisplayValue
    ? Number((Number(debouncedDisplayValue) * 100).toFixed(2)).toString()
    : undefined

  useEffect(() => {
    externalSetValue(bpsValue)
  }, [bpsValue, externalSetValue])

  const [mode, setMode] = useState<SlippageToleranceMode>(
    currentSlippageTolerance ? 'Custom' : 'Auto'
  )
  const [open, setOpen] = useFallbackState(
    _open !== undefined ? _open : false,
    _setOpen
      ? [_open ?? false, _setOpen as Dispatch<SetStateAction<boolean>>]
      : undefined
  )

  const isInlineVariant = variant === 'inline'
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && mode === 'Custom') {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }, [open, mode])

  useEffect(() => {
    if (!open) {
      setDisplayValue(convertBpsToPercent(currentSlippageTolerance))
      setMode(currentSlippageTolerance ? 'Custom' : 'Auto')
    }
  }, [currentSlippageTolerance, open])

  const slippageRating = displayValue
    ? getSlippageRating(displayValue)
    : undefined
  const slippageRatingColor = slippageRating
    ? ratingToColor[slippageRating]
    : undefined

  const handleInputChange = (value: string) => {
    const sanitizedValue = value.replace(/[^0-9.]/g, '')

    if (sanitizedValue === '') {
      setDisplayValue(undefined)
      return
    }

    if (sanitizedValue === '.') {
      setDisplayValue('0.')
      return
    }

    if (!/^[0-9]*\.?[0-9]{0,2}$/.test(sanitizedValue)) {
      return
    }

    if (
      sanitizedValue.startsWith('0') &&
      sanitizedValue.length > 1 &&
      sanitizedValue[1] !== '.'
    ) {
      return
    }

    const numValue = parseFloat(sanitizedValue)
    if (!Number.isNaN(numValue)) {
      if (numValue > 100) {
        setDisplayValue('100')
        return
      }
    }

    setDisplayValue(sanitizedValue)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
    }
  }

  const handleClose = () => {
    const value = parseFloat(displayValue ?? '0')
    const isAutoMode =
      mode === 'Auto' ||
      displayValue === undefined ||
      Number.isNaN(value) ||
      value < 0.01

    if (isAutoMode) {
      setDisplayValue(undefined)
    }

    onAnalyticEvent?.(EventNames.SWAP_SLIPPAGE_TOLERANCE_SET, {
      value: isAutoMode ? 'auto' : displayValue
    })
  }

  const resolvedDisplayValue = useMemo(() => {
    return displayValue ?? convertBpsToPercent(currentSlippageTolerance)
  }, [displayValue, currentSlippageTolerance])

  const buttonValueText = resolvedDisplayValue
    ? `${resolvedDisplayValue}%`
    : 'Auto'

  const triggerButton = (
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
      onClick={() => {
        const nextState = !open
        setOpen(nextState)
        if (nextState) {
          onOpenSlippageConfig?.()
        } else {
          handleClose()
        }
      }}
    >
      <Text style="subtitle3" color="subtle">
        {label}
      </Text>
      <Text style="subtitle2" css={{ color: slippageRatingColor ?? 'gray9' }}>
        {buttonValueText}
      </Text>
      {!isInlineVariant && showGearIcon ? (
        <FontAwesomeIcon icon={faGear} />
      ) : null}
    </Button>
  )

  const contentStyles = isInlineVariant
    ? {
        width: '100%',
        gap: '2',
        backgroundColor: 'widget-card-background',
        border: 'widget-card-border',
        borderRadius: 'widget-card-border-radius',
        p: '3',
        mt: '2'
      }
    : { width: '100%', gap: '2', maxWidth: 188 }

  const content = (
    <Flex direction="column" css={contentStyles}>
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
            <FontAwesomeIcon icon={faInfoCircle} />
          </Box>
        </Tooltip>
      </Flex>

      <TabsRoot
        value={mode}
        onValueChange={(value) => {
          const nextMode = value as SlippageToleranceMode
          setMode(nextMode)
          if (nextMode === 'Auto') {
            setDisplayValue(undefined)
          } else if (!displayValue) {
            setDisplayValue(
              convertBpsToPercent(currentSlippageTolerance) ?? '2'
            )
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
            We'll set the slippage automatically to minimize the failure rate.
          </Text>
        </TabsContent>

        <TabsContent
          value="Custom"
          css={{
            display: 'flex',
            width: '100%',
            flexDirection: 'column',
            gap: '1'
          }}
        >
          <Flex css={{ display: 'flex', width: '100%', position: 'relative' }}>
            <Input
              ref={inputRef}
              value={displayValue ?? ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                handleInputChange(event.target.value)
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!isInlineVariant) {
                  handleClose()
                }
              }}
              placeholder="0.50"
              css={{
                height: '36px',
                pr: '28px !important',
                border: 'none',
                textAlign: 'right',
                width: '100%',
                color: slippageRatingColor ?? 'gray9',
                backgroundColor: 'gray2'
              }}
            />
            <Box
              css={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: slippageRatingColor ?? 'gray9'
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
  )

  if (isInlineVariant) {
    return (
      <div className="relay-kit-reset">
        <Flex direction="column" css={{ width: '100%' }}>
          {triggerButton}
          {open ? content : null}
        </Flex>
      </div>
    )
  }

  return (
    <div className="relay-kit-reset">
      <Dropdown
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (isOpen) {
            onOpenSlippageConfig?.()
          }
          if (!isOpen) {
            handleClose()
          }
        }}
        trigger={triggerButton}
        contentProps={{
          align: 'end',
          sideOffset: 5,
          css: { maxWidth: 188, mx: 0 },
          avoidCollisions: false,
          onCloseAutoFocus: (event) => {
            event.preventDefault()
          }
        }}
      >
        {content}
      </Dropdown>
    </div>
  )
}
