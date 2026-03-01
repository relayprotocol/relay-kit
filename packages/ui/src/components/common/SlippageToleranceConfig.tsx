import type { FC, Dispatch, SetStateAction, KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Dropdown } from '../primitives/Dropdown.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGear, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import { Button, Flex, Text, Box } from '../primitives/index.js'
import Tooltip from '../primitives/Tooltip.js'
import {
  getSlippageRating,
  ratingToColor,
  type SlippageToleranceMode
} from '../../utils/slippage.js'
import { EventNames } from '../../constants/events.js'
import { useDebounceValue, useMediaQuery } from 'usehooks-ts'
import useFallbackState from '../../hooks/useFallbackState.js'
import { Modal } from './Modal.js'
import { convertBpsToPercent } from '../../utils/numbers.js'
import { SlippageTabs } from './SlippageTabs.js'

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
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          borderRadius: '8px',
          padding: '4px 6px',
          backgroundColor: 'gray3'
        }}
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
        css={{
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1',
          bg: 'subtle-background-color',
          color: slippageRatingColor ?? 'gray9',
          p: '2',
          borderRadius: 12,
          border: '1px solid',
          borderColor: 'gray5',
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
          css={{
            width: '100%',
            minHeight: '262px',
            maxHeight: '90vh'
          }}
        >
          <Flex direction="column" css={{ width: '100%', gap: '4' }}>
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

            <SlippageTabs {...slippageTabsProps} />
          </Flex>
        </Dropdown>
      )}
    </div>
  )
}
