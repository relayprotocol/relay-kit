import type {
  FC,
  ChangeEvent,
  Dispatch,
  SetStateAction,
  KeyboardEvent
} from 'react'
import { useEffect, useRef, useState } from 'react'
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

const tokenToColor = (token: string | undefined): string | undefined => {
  if (!token) return undefined
  return `var(--relay-colors-${token})`
}
import { EventNames } from '../../constants/events.js'
import { useDebounceValue, useMediaQuery } from 'usehooks-ts'
import useFallbackState from '../../hooks/useFallbackState.js'
import { Modal } from './Modal.js'
import { convertBpsToPercent } from '../../utils/numbers.js'
import { cn } from '../../utils/cn.js'

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
  showLabel?: boolean
  widgetType?: 'token' | 'swap'
}

type SlippageTabsProps = {
  mode: SlippageToleranceMode
  setMode: (mode: SlippageToleranceMode) => void
  displayValue: string | undefined
  setDisplayValue: (value: string | undefined) => void
  handleInputChange: (value: string) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleClose: () => void
  slippageRating: string | undefined
  slippageRatingColor: string | undefined
  inputRef: React.RefObject<HTMLInputElement | null>
  widgetType?: 'token' | 'swap'
}

const SlippageTabs: FC<SlippageTabsProps> = ({
  mode,
  setMode,
  displayValue,
  setDisplayValue,
  handleInputChange,
  handleKeyDown,
  handleClose,
  slippageRating,
  slippageRatingColor,
  inputRef,
  widgetType
}) => {
  const isMobile = useMediaQuery('(max-width: 520px)')
  const isTokenWidget = widgetType === 'token'
  return (
    <TabsRoot
      value={mode}
      onValueChange={(value) => {
        setMode(value as SlippageToleranceMode)
        if (value === 'Auto') {
          setDisplayValue(undefined)
        }
      }}
      className={cn(
        'relay-flex relay-flex-col relay-w-full',
        isTokenWidget ? 'relay-gap-1' : 'relay-gap-3 sm:relay-gap-2'
      )}
    >
      <TabsList className="relay-w-full">
        <TabsTrigger value="Auto" className="relay-w-1/2">
          Auto
        </TabsTrigger>
        <TabsTrigger value="Custom" className="relay-w-1/2">
          Custom
        </TabsTrigger>
      </TabsList>

      <TabsContent value="Auto" className="relay-w-full">
        <Text
          style={isTokenWidget ? 'body3' : 'body2'}
          color="subtle"
          className={cn(
            isTokenWidget
              ? 'relay-leading-normal relay-text-xs'
              : 'relay-leading-[14px] sm:relay-text-xs'
          )}
        >
          We'll set the slippage automatically to minimize the failure rate.
        </Text>
      </TabsContent>

      <TabsContent
        value="Custom"
        className="relay-flex relay-w-full relay-overflow-hidden relay-flex-col relay-gap-1"
      >
        {/* Mobile shortcut buttons */}
        <Flex
          className="relay-hidden max-[520px]:relay-flex max-[520px]:relay-w-full max-[520px]:relay-gap-2 max-[520px]:relay-mb-2"
        >
          <Button
            color="ghost"
            size="small"
            className="relay-flex-1 relay-min-h-8 relay-bg-[var(--relay-colors-gray3)] relay-font-medium relay-text-sm relay-py-[2px] relay-rounded-[6px] relay-justify-center hover:relay-bg-[var(--relay-colors-gray5)]"
            onClick={() => handleInputChange('1')}
          >
            1%
          </Button>
          <Button
            color="ghost"
            size="small"
            className="relay-flex-1 relay-min-h-8 relay-bg-[var(--relay-colors-gray3)] relay-font-medium relay-text-sm relay-py-[2px] relay-rounded-[6px] relay-justify-center hover:relay-bg-[var(--relay-colors-gray5)]"
            onClick={() => handleInputChange('2')}
          >
            2%
          </Button>
          <Button
            color="ghost"
            size="small"
            className="relay-flex-1 relay-min-h-8 relay-bg-[var(--relay-colors-gray3)] relay-font-medium relay-text-sm relay-py-[2px] relay-rounded-[6px] relay-justify-center hover:relay-bg-[var(--relay-colors-gray5)]"
            onClick={() => handleInputChange('5')}
          >
            5%
          </Button>
        </Flex>

        <Flex className="relay-flex relay-w-full relay-relative">
          <Input
            ref={inputRef}
            value={displayValue || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleInputChange(e.target.value)
            }
            onKeyDown={handleKeyDown}
            onBlur={handleClose}
            onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
              // Move cursor to end of input on focus for better mobile UX
              if (isMobile) {
                const input = e.target
                setTimeout(() => {
                  input.setSelectionRange(
                    input.value.length,
                    input.value.length
                  )
                }, 0)
              }
            }}
            placeholder="2"
            containerClassName="relay-w-full"
            className={cn(
              'relay-h-9 !relay-pr-7 relay-border-none relay-text-right relay-w-full',
              'max-[520px]:relay-bg-transparent max-[520px]:relay-border max-[520px]:relay-border-solid max-[520px]:relay-border-[var(--relay-colors-gray-5)]'
            )}
            style={{ color: tokenToColor(slippageRatingColor) }}
          />
          <Box
            className="relay-absolute relay-right-2 relay-top-1/2 -relay-translate-y-1/2"
          >
            <span style={{ color: tokenToColor(slippageRatingColor) }}>%</span>
          </Box>
        </Flex>

        {slippageRating === 'very-high' ? (
          <Text style="body3" className="relay-text-[color:var(--relay-colors-red11)]">
            Very high slippage
          </Text>
        ) : null}
        {slippageRating === 'high' ? (
          <Text style="body3" className="relay-text-[color:var(--relay-colors-amber11)]">
            High slippage
          </Text>
        ) : null}
      </TabsContent>
    </TabsRoot>
  )
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
  showGearIcon = true,
  showLabel = false,
  widgetType
}) => {
  const isMobile = useMediaQuery('(max-width: 520px)')
  const [displayValue, setDisplayValue] = useState<string | undefined>(() =>
    currentSlippageTolerance !== undefined
      ? convertBpsToPercent(currentSlippageTolerance)
      : undefined
  )
  const [debouncedDisplayValue] = useDebounceValue(displayValue, 500)

  const bpsValue = debouncedDisplayValue
    ? Number((Number(debouncedDisplayValue) * 100).toFixed(2)).toString()
    : undefined

  useEffect(() => {
    externalSetValue(bpsValue)
  }, [bpsValue, externalSetValue])

  const [mode, setMode] = useState<SlippageToleranceMode>(
    currentSlippageTolerance !== undefined ? 'Custom' : 'Auto'
  )
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

  useEffect(() => {
    if (!open && currentSlippageTolerance !== undefined) {
      setDisplayValue(convertBpsToPercent(currentSlippageTolerance))
      setMode(currentSlippageTolerance !== undefined ? 'Custom' : 'Auto')
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

  const triggerButton =
    widgetType === 'token' ? (
      <Button
        aria-label="Slippage Tolerance Configuration"
        color="ghost"
        size="none"
        className="relay-flex relay-items-center relay-justify-center relay-gap-1 relay-rounded-lg relay-px-[6px] relay-py-1 relay-bg-[var(--relay-colors-gray3)]"
      >
        <Text style="subtitle3" color="subtle">
          Slippage
        </Text>
        <Text style="subtitle3">
          {displayValue ? `${displayValue}%` : 'Auto'}
        </Text>
      </Button>
    ) : (
      <Button
        aria-label="Slippage Tolerance Configuration"
        color="ghost"
        size="none"
        className="relay-items-center relay-justify-center relay-gap-1 relay-bg-[var(--relay-colors-subtle-background-color)] relay-p-2 relay-rounded-[12px] relay-border relay-border-solid relay-border-[var(--relay-colors-gray5)] relay-h-9 relay-px-[10px]"
        style={{ color: tokenToColor(slippageRatingColor) ?? 'var(--relay-colors-gray9)' }}
      >
        {open === false && displayValue && (
          <Text style="subtitle2" className={slippageRatingColor ? `relay-text-[color:var(--relay-colors-${slippageRatingColor})]` : undefined}>
            {displayValue}%
          </Text>
        )}
        <FontAwesomeIcon icon={faGear} />
      </Button>
    )

  const slippageTabsProps = {
    mode,
    setMode,
    displayValue,
    setDisplayValue,
    handleInputChange,
    handleKeyDown,
    handleClose,
    slippageRating,
    slippageRatingColor,
    inputRef,
    widgetType
  }

  return (
    <div className="relay-kit-reset">
      {isMobile ? (
        <Modal
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) {
              handleClose()
            }
          }}
          trigger={triggerButton}
          className="relay-w-full relay-min-h-[262px] relay-max-h-[90vh]"
        >
          <Flex direction="column" className="relay-w-full relay-gap-4">
            <Text style="h6">Max Slippage</Text>

            <Text style="body3" color="subtle">
              If the price exceeds the maximum slippage percentage, the
              transaction will revert.
            </Text>

            <SlippageTabs {...slippageTabsProps} />
          </Flex>
        </Modal>
      ) : (
        <Dropdown
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) {
              handleClose()
            }
          }}
          trigger={triggerButton}
          contentProps={{
            align: 'end',
            sideOffset: 5,
            className: 'relay-max-w-[188px] relay-mx-0',
            avoidCollisions: false,
            onCloseAutoFocus: (e) => {
              e.preventDefault()
            }
          }}
        >
          <Flex
            direction="column"
            className="relay-w-full relay-gap-2 relay-max-w-[188px]"
          >
            <Flex direction="row" className="relay-gap-1 relay-items-center">
              <Text style="subtitle3">Max Slippage</Text>
              <Tooltip
                content={
                  <Text
                    style="tiny"
                    className="relay-inline-block relay-max-w-[190px]"
                  >
                    If the price exceeds the maximum slippage percentage, the
                    transaction will revert.
                  </Text>
                }
              >
                <Box className="relay-text-[color:var(--relay-colors-gray8)]">
                  <FontAwesomeIcon icon={faInfoCircle} width={14} height={14} />
                </Box>
              </Tooltip>
            </Flex>

            <SlippageTabs {...slippageTabsProps} />
          </Flex>
        </Dropdown>
      )}
    </div>
  )
}
