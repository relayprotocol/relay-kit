import type { FC, Dispatch, SetStateAction, KeyboardEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faGear,
  faInfoCircle,
  faTrash,
  faCheck,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons'
import { Button, Flex, Input, Text, Box } from '../primitives/index.js'
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
import { useSwapSources } from '@relayprotocol/relay-kit-hooks'
import useRelayClient from '../../hooks/useRelayClient.js'
import {
  formatSourceName,
  isInternalSource,
  swapSourceLogos
} from '../../constants/swapSourceLogos.js'
import {
  getExcludedSwapSources,
  setExcludedSwapSources,
  getCustomRpcOverrides,
  setCustomRpcOverride,
  removeCustomRpcOverride
} from '../../utils/advancedSettings.js'
import { useInternalRelayChains } from '../../hooks/useInternalRelayChains.js'
import ChainIcon from '../primitives/ChainIcon.js'
import { StyledSwitch, StyledThumb } from '../primitives/Switch.js'

type AdvancedSettingsProps = {
  open?: boolean
  setOpen?: (open: boolean) => void
  setSlippageTolerance: (value: string | undefined) => void
  currentSlippageTolerance?: string | undefined
  onAnalyticEvent?: (eventName: string, data?: any) => void
  onExcludedSwapSourcesChange?: (excluded: string[]) => void
  onCustomRpcChange?: (overrides: Record<number, string>) => void
  widgetType?: 'token' | 'swap'
}

export const AdvancedSettings: FC<AdvancedSettingsProps> = ({
  open: _open,
  setOpen: _setOpen,
  setSlippageTolerance: externalSetValue,
  currentSlippageTolerance,
  onAnalyticEvent,
  onExcludedSwapSourcesChange,
  onCustomRpcChange,
  widgetType
}) => {
  const isMobile = useMediaQuery('(max-width: 520px)')
  const relayClient = useRelayClient()

  // Slippage state
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

  const handleSlippageClose = () => {
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

  // Swap sources state
  const { data: swapSourcesData } = useSwapSources(relayClient?.baseApiUrl)
  const allSources = useMemo(
    () =>
      (swapSourcesData?.sources ?? []).filter((s) => !isInternalSource(s)),
    [swapSourcesData]
  )
  const [excludedSources, setExcludedSourcesState] = useState<string[]>(
    () => getExcludedSwapSources()
  )
  const enabledCount = allSources.length - excludedSources.filter((s) => allSources.includes(s)).length

  const handleToggleSource = useCallback(
    (source: string) => {
      const newExcluded = excludedSources.includes(source)
        ? excludedSources.filter((s) => s !== source)
        : [...excludedSources, source]
      setExcludedSourcesState(newExcluded)
      setExcludedSwapSources(newExcluded)
      onExcludedSwapSourcesChange?.(newExcluded)
      onAnalyticEvent?.(EventNames.SWAP_SOURCES_CHANGED, {
        excluded: newExcluded
      })
    },
    [excludedSources, onExcludedSwapSourcesChange, onAnalyticEvent]
  )

  const handleSelectAll = useCallback(() => {
    setExcludedSourcesState([])
    setExcludedSwapSources([])
    onExcludedSwapSourcesChange?.([])
    onAnalyticEvent?.(EventNames.SWAP_SOURCES_CHANGED, { excluded: [] })
  }, [onExcludedSwapSourcesChange, onAnalyticEvent])

  const handleDeselectAll = useCallback(() => {
    const allExcluded = [...allSources]
    setExcludedSourcesState(allExcluded)
    setExcludedSwapSources(allExcluded)
    onExcludedSwapSourcesChange?.(allExcluded)
    onAnalyticEvent?.(EventNames.SWAP_SOURCES_CHANGED, {
      excluded: allExcluded
    })
  }, [allSources, onExcludedSwapSourcesChange, onAnalyticEvent])

  // Custom RPC state
  const { chains } = useInternalRelayChains()
  const [rpcOverrides, setRpcOverridesState] = useState<
    Record<number, string>
  >(() => getCustomRpcOverrides())
  const [newRpcChainId, setNewRpcChainId] = useState<number | ''>('')
  const [newRpcUrl, setNewRpcUrl] = useState('')

  const handleAddRpc = useCallback(() => {
    if (newRpcChainId === '' || !newRpcUrl.trim()) return
    const chainId = Number(newRpcChainId)
    const url = newRpcUrl.trim()
    setCustomRpcOverride(chainId, url)
    const updated = { ...rpcOverrides, [chainId]: url }
    setRpcOverridesState(updated)
    onCustomRpcChange?.(updated)
    onAnalyticEvent?.(EventNames.CUSTOM_RPC_ADDED, { chainId, rpcUrl: url })
    setNewRpcChainId('')
    setNewRpcUrl('')
  }, [
    newRpcChainId,
    newRpcUrl,
    rpcOverrides,
    onCustomRpcChange,
    onAnalyticEvent
  ])

  const handleRemoveRpc = useCallback(
    (chainId: number) => {
      removeCustomRpcOverride(chainId)
      const updated = { ...rpcOverrides }
      delete updated[chainId]
      setRpcOverridesState(updated)
      onCustomRpcChange?.(updated)
      onAnalyticEvent?.(EventNames.CUSTOM_RPC_REMOVED, { chainId })
    },
    [rpcOverrides, onCustomRpcChange, onAnalyticEvent]
  )

  const slippageTabsProps = {
    mode,
    setMode,
    displayValue,
    setDisplayValue,
    handleInputChange,
    handleKeyDown,
    handleClose: handleSlippageClose,
    slippageRating,
    slippageRatingColor,
    inputRef,
    widgetType
  }

  const allEnabled = excludedSources.filter((s) => allSources.includes(s)).length === 0
  const noneEnabled = excludedSources.filter((s) => allSources.includes(s)).length === allSources.length

  const triggerButton = (
    <Button
      aria-label="Advanced Settings"
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

  const chainName = (chainId: number) => {
    const chain = chains?.find((c) => c.id === chainId)
    return chain?.displayName ?? chain?.name ?? `Chain ${chainId}`
  }

  return (
    <div className="relay-kit-reset">
      <Modal
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) {
            handleSlippageClose()
          }
        }}
        trigger={triggerButton}
        css={{
          width: isMobile ? '100%' : '420px',
          maxWidth: '100%',
          minHeight: '300px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <Flex
          direction="column"
          css={{ width: '100%', gap: '5', pb: '2' }}
        >
          <Text style="h6">Advanced Settings</Text>

          {/* Slippage Section */}
          <Flex direction="column" css={{ gap: '2' }}>
            <Flex
              direction="row"
              css={{ gap: '1', alignItems: 'center' }}
            >
              <Text style="subtitle2">Max Slippage</Text>
              <Tooltip
                content={
                  <Text
                    style="tiny"
                    css={{ display: 'inline-block', maxWidth: 220 }}
                  >
                    If the price exceeds the maximum slippage percentage, the
                    transaction will revert.
                  </Text>
                }
              >
                <Box css={{ color: 'gray8' }}>
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    width={14}
                    height={14}
                  />
                </Box>
              </Tooltip>
            </Flex>

            <SlippageTabs {...slippageTabsProps} />
          </Flex>

          {/* Swap Providers Section */}
          <Flex direction="column" css={{ gap: '2' }}>
            <Flex
              direction="row"
              css={{
                gap: '1',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Flex
                direction="row"
                css={{ gap: '1', alignItems: 'center' }}
              >
                <Text style="subtitle2">Swap Providers</Text>
                <Tooltip
                  content={
                    <Text
                      style="tiny"
                      css={{ display: 'inline-block', maxWidth: 220 }}
                    >
                      Choose which swap providers are used when routing your
                      transactions. Disabling providers may reduce available
                      routes or result in worse pricing.
                    </Text>
                  }
                >
                  <Box css={{ color: 'gray8' }}>
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      width={14}
                      height={14}
                    />
                  </Box>
                </Tooltip>
                <Text style="body3" color="subtle">
                  {enabledCount} of {allSources.length} enabled
                </Text>
              </Flex>
              <Button
                color="ghost"
                size="none"
                css={{
                  fontSize: '12px',
                  color: 'primary-color',
                  cursor: 'pointer'
                }}
                onClick={allEnabled ? handleDeselectAll : handleSelectAll}
              >
                {allEnabled ? 'Deselect All' : 'Select All'}
              </Button>
            </Flex>

            <Flex
              direction="column"
              css={{
                maxHeight: '200px',
                overflow: 'auto',
                gap: '1',
                border: '1px solid',
                borderColor: 'gray5',
                borderRadius: '8px',
                p: '2'
              }}
            >
              {allSources.map((source) => {
                const enabled = !excludedSources.includes(source)
                return (
                  <Flex
                    key={source}
                    direction="row"
                    css={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: '1',
                      px: '1',
                      borderRadius: '6px',
                      '&:hover': { backgroundColor: 'gray3' }
                    }}
                  >
                    <Flex
                      direction="row"
                      css={{ alignItems: 'center', gap: '2' }}
                    >
                      {swapSourceLogos[source] ? (
                        <img
                          src={swapSourceLogos[source]}
                          alt={formatSourceName(source)}
                          width={20}
                          height={20}
                          style={{
                            borderRadius: '4px',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <Box
                          css={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            backgroundColor: 'gray5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Text
                            style="tiny"
                            css={{ fontSize: '10px' }}
                          >
                            {formatSourceName(source).charAt(0)}
                          </Text>
                        </Box>
                      )}
                      <Text style="body3">
                        {formatSourceName(source)}
                      </Text>
                    </Flex>
                    <StyledSwitch
                      checked={enabled}
                      onCheckedChange={() => handleToggleSource(source)}
                    >
                      <StyledThumb />
                    </StyledSwitch>
                  </Flex>
                )
              })}
              {allSources.length === 0 && (
                <Text style="body3" color="subtle" css={{ py: '2', textAlign: 'center' }}>
                  Loading providers...
                </Text>
              )}
            </Flex>
          </Flex>

          {/* Custom RPC Section */}
          <Flex direction="column" css={{ gap: '2' }}>
            <Flex
              direction="row"
              css={{ gap: '1', alignItems: 'center' }}
            >
              <Text style="subtitle2">Custom RPC</Text>
              <Tooltip
                content={
                  <Text
                    style="tiny"
                    css={{ display: 'inline-block', maxWidth: 220 }}
                  >
                    Override RPC endpoints for origin chain transactions. A
                    page refresh is required for changes to take effect.
                  </Text>
                }
              >
                <Box css={{ color: 'amber9' }}>
                  <FontAwesomeIcon
                    icon={faTriangleExclamation}
                    width={14}
                    height={14}
                  />
                </Box>
              </Tooltip>
            </Flex>

            {/* Current overrides */}
            {Object.entries(rpcOverrides).length > 0 && (
              <Flex
                direction="column"
                css={{
                  gap: '1',
                  border: '1px solid',
                  borderColor: 'gray5',
                  borderRadius: '8px',
                  p: '2'
                }}
              >
                {Object.entries(rpcOverrides).map(([chainIdStr, url]) => {
                  const chainId = Number(chainIdStr)
                  return (
                    <Flex
                      key={chainId}
                      direction="row"
                      css={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: '1',
                        px: '1',
                        borderRadius: '6px',
                        '&:hover': { backgroundColor: 'gray3' }
                      }}
                    >
                      <Flex
                        direction="row"
                        css={{ alignItems: 'center', gap: '2', minWidth: 0, flex: 1 }}
                      >
                        <ChainIcon chainId={chainId} width={20} height={20} />
                        <Flex direction="column" css={{ minWidth: 0, flex: 1 }}>
                          <Text style="body3">{chainName(chainId)}</Text>
                          <Text
                            style="tiny"
                            color="subtle"
                            css={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '200px'
                            }}
                          >
                            {url}
                          </Text>
                        </Flex>
                      </Flex>
                      <Button
                        color="ghost"
                        size="none"
                        css={{ color: 'gray9', p: '1', flexShrink: 0 }}
                        onClick={() => handleRemoveRpc(chainId)}
                      >
                        <FontAwesomeIcon
                          icon={faTrash}
                          width={12}
                          height={12}
                        />
                      </Button>
                    </Flex>
                  )
                })}
              </Flex>
            )}

            {/* Add override form */}
            <Flex direction="column" css={{ gap: '2' }}>
              <Flex direction="row" css={{ gap: '2' }}>
                <Box
                  css={{
                    flex: '0 0 140px',
                    position: 'relative'
                  }}
                >
                  <select
                    value={newRpcChainId}
                    onChange={(e) =>
                      setNewRpcChainId(
                        e.target.value ? Number(e.target.value) : ''
                      )
                    }
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid var(--colors-gray-5, #ddd)',
                      padding: '0 8px',
                      fontSize: '13px',
                      backgroundColor: 'transparent',
                      color: 'inherit',
                      cursor: 'pointer',
                      appearance: 'auto'
                    }}
                  >
                    <option value="">Chain...</option>
                    {chains
                      ?.filter((c) => !rpcOverrides[c.id])
                      .map((chain) => (
                        <option key={chain.id} value={chain.id}>
                          {chain.displayName ?? chain.name}
                        </option>
                      ))}
                  </select>
                </Box>
                <Input
                  value={newRpcUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewRpcUrl(e.target.value)
                  }
                  placeholder="https://rpc-url..."
                  containerCss={{ flex: 1 }}
                  css={{
                    height: '36px',
                    width: '100%',
                    fontSize: '13px'
                  }}
                />
              </Flex>
              <Button
                color="primary"
                size="small"
                disabled={newRpcChainId === '' || !newRpcUrl.trim()}
                css={{
                  width: '100%',
                  justifyContent: 'center',
                  height: '32px'
                }}
                onClick={handleAddRpc}
              >
                Add Override
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Modal>
    </div>
  )
}
