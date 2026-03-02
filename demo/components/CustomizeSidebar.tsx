import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useCustomize } from 'context/customizeContext'
import { useTheme } from 'next-themes'
import { ChainVM } from '@relayprotocol/relay-sdk'

const WALLET_VM_TYPES = [
  'evm',
  'bvm',
  'svm',
  'suivm',
  'tvm',
  'hypevm'
] as const

type CustomizeSidebarProps = {
  singleChainMode: boolean
  setSingleChainMode: (value: boolean) => void
  supportedWalletVMs: ChainVM[]
  setSupportedWalletVMs: (
    value: ChainVM[] | ((prev: ChainVM[]) => ChainVM[])
  ) => void
}

// --- Color manipulation utilities ---
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h = 0,
    s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360
  s /= 100
  l /= 100
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n * 255)))
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Darken a hex color by a percentage (0-100) */
function darken(hex: string, amount: number): string {
  try {
    const [h, s, l] = hexToHsl(hex)
    return hslToHex(h, s, Math.max(0, l - amount))
  } catch {
    return hex
  }
}

/** Lighten a hex color by a percentage (0-100) */
function lighten(hex: string, amount: number): string {
  try {
    const [h, s, l] = hexToHsl(hex)
    return hslToHex(h, s, Math.min(100, l + amount))
  } catch {
    return hex
  }
}

// Default colors that approximate the actual CSS variable values
const LIGHT_DEFAULTS: Record<string, string> = {
  primaryColor: '#7c65c1',
  focusColor: '#9b8ce0',
  subtleBackgroundColor: '#fcfcfc',
  subtleBorderColor: '#e6e6e6',
  'text.default': '#1a1a1a',
  'text.subtle': '#6f6f6f',
  'widget.background': '#ffffff',
  'widget.card.background': '#fcfcfc',
  'widget.selector.background': '#f5f5f5',
  'buttons.primary.background': '#7c65c1',
  'buttons.primary.color': '#ffffff',
  'buttons.secondary.background': '#ede9f6',
  'buttons.secondary.color': '#4615c8',
  'input.background': '#f0f0f0',
  'modal.background': '#fcfcfc',
  'anchor.color': '#4615c8'
}

const DARK_DEFAULTS: Record<string, string> = {
  primaryColor: '#9b8ce0',
  focusColor: '#7c65c1',
  subtleBackgroundColor: '#111111',
  subtleBorderColor: '#333333',
  'text.default': '#ececec',
  'text.subtle': '#a0a0a0',
  'widget.background': '#1a1a1a',
  'widget.card.background': '#111111',
  'widget.selector.background': '#222222',
  'buttons.primary.background': '#9b8ce0',
  'buttons.primary.color': '#ffffff',
  'buttons.secondary.background': '#2a2440',
  'buttons.secondary.color': '#c4b8f3',
  'input.background': '#2a2a2a',
  'modal.background': '#111111',
  'anchor.color': '#c4b8f3'
}

// Debounced color input — renders immediately but debounces context updates
const ColorInput: FC<{
  label: string
  value: string
  defaultValue: string
  onChange: (value: string) => void
  onClear: () => void
}> = ({ label, value, defaultValue, onChange, onClear }) => {
  const [localValue, setLocalValue] = useState(value || defaultValue)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isOverridden = !!value

  // Sync from external changes (e.g. reset button)
  useEffect(() => {
    setLocalValue(value || defaultValue)
  }, [value, defaultValue])

  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange(newValue)
      }, 150)
    },
    [onChange]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="color"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          width: 28,
          height: 28,
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          padding: 0,
          background: 'transparent'
        }}
      />
      <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
      {isOverridden && (
        <button
          onClick={onClear}
          style={{
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid currentColor',
            background: 'transparent',
            cursor: 'pointer',
            opacity: 0.4
          }}
        >
          Reset
        </button>
      )}
    </div>
  )
}

const SectionTitle: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      opacity: 0.5,
      marginBottom: 4
    }}
  >
    {children}
  </div>
)

const SubLabel: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 11, opacity: 0.4, marginTop: 6, marginBottom: -2 }}>
    {children}
  </div>
)

export const CustomizeSidebar: FC<CustomizeSidebarProps> = ({
  singleChainMode,
  setSingleChainMode,
  supportedWalletVMs,
  setSupportedWalletVMs
}) => {
  const [open, setOpen] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const defaults = isDark ? DARK_DEFAULTS : LIGHT_DEFAULTS
  const {
    themeOverrides,
    updateThemeValue,
    setThemeOverrides
  } = useCustomize()

  const getNestedValue = (path: string): string => {
    const keys = path.split('.')
    let obj: any = themeOverrides
    for (const key of keys) {
      if (!obj || typeof obj !== 'object') return ''
      obj = obj[key]
    }
    return typeof obj === 'string' ? obj : ''
  }

  // Auto-derive hover state from a base color
  const deriveHover = useCallback(
    (baseHex: string) => {
      return isDark ? lighten(baseHex, 8) : darken(baseHex, 8)
    },
    [isDark]
  )

  // When setting a base color, also auto-set its hover variant
  const setWithHover = useCallback(
    (basePath: string, hoverPath: string, value: string) => {
      updateThemeValue(basePath, value)
      updateThemeValue(hoverPath, deriveHover(value))
    },
    [updateThemeValue, deriveHover]
  )

  const clearWithHover = useCallback(
    (basePath: string, hoverPath: string) => {
      updateThemeValue(basePath, undefined)
      updateThemeValue(hoverPath, undefined)
    },
    [updateThemeValue]
  )

  const sidebarBg = isDark ? '#111' : '#fff'
  const sidebarBorder = isDark
    ? 'rgba(255,255,255,0.1)'
    : 'rgba(0,0,0,0.08)'
  const sidebarText = isDark ? '#e5e5e5' : '#1a1a1a'

  return (
    <>
      <style>{`.customize-sidebar { display: none; } @media (min-width: 768px) { .customize-sidebar { display: contents; } }`}</style>
      <div className="customize-sidebar">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          left: open ? 296 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          background: isDark ? '#222' : '#fff',
          border: `1px solid ${sidebarBorder}`,
          borderLeft: open ? 'none' : `1px solid ${sidebarBorder}`,
          borderRadius: '0 8px 8px 0',
          padding: '12px 8px',
          cursor: 'pointer',
          writingMode: 'vertical-rl',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.5px',
          color: sidebarText,
          transition: 'left 0.2s ease',
          boxShadow: isDark
            ? '2px 0 8px rgba(0,0,0,0.3)'
            : '2px 0 8px rgba(0,0,0,0.06)'
        }}
      >
        Customize
      </button>

      {/* Sidebar panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: open ? 0 : -296,
          width: 296,
          height: '100vh',
          background: sidebarBg,
          borderRight: `1px solid ${sidebarBorder}`,
          color: sidebarText,
          zIndex: 999,
          transition: 'left 0.2s ease',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${sidebarBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600 }}>Customize</span>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: sidebarText,
              opacity: 0.5,
              padding: '0 4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Theme Colors */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${sidebarBorder}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <SectionTitle>Colors</SectionTitle>

          <ColorInput
            label="Primary Color"
            value={getNestedValue('primaryColor')}
            defaultValue={defaults['primaryColor']}
            onChange={(v) => updateThemeValue('primaryColor', v)}
            onClear={() => updateThemeValue('primaryColor', undefined)}
          />

          <ColorInput
            label="Focus Color"
            value={getNestedValue('focusColor')}
            defaultValue={defaults['focusColor']}
            onChange={(v) => updateThemeValue('focusColor', v)}
            onClear={() => updateThemeValue('focusColor', undefined)}
          />

          <SubLabel>Text</SubLabel>

          <ColorInput
            label="Default Text"
            value={getNestedValue('text.default')}
            defaultValue={defaults['text.default']}
            onChange={(v) => updateThemeValue('text.default', v)}
            onClear={() => updateThemeValue('text.default', undefined)}
          />

          <ColorInput
            label="Subtle Text"
            value={getNestedValue('text.subtle')}
            defaultValue={defaults['text.subtle']}
            onChange={(v) => updateThemeValue('text.subtle', v)}
            onClear={() => updateThemeValue('text.subtle', undefined)}
          />

          <ColorInput
            label="Anchor/Link"
            value={getNestedValue('anchor.color')}
            defaultValue={defaults['anchor.color']}
            onChange={(v) => {
              updateThemeValue('anchor.color', v)
              updateThemeValue('anchor.hover.color', deriveHover(v))
            }}
            onClear={() => {
              updateThemeValue('anchor.color', undefined)
              updateThemeValue('anchor.hover.color', undefined)
            }}
          />
        </div>

        {/* Buttons */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${sidebarBorder}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <SectionTitle>Buttons</SectionTitle>

          <SubLabel>Primary (hover auto-derived)</SubLabel>

          <ColorInput
            label="Background"
            value={getNestedValue('buttons.primary.background')}
            defaultValue={defaults['buttons.primary.background']}
            onChange={(v) =>
              setWithHover(
                'buttons.primary.background',
                'buttons.primary.hover.background',
                v
              )
            }
            onClear={() =>
              clearWithHover(
                'buttons.primary.background',
                'buttons.primary.hover.background'
              )
            }
          />

          <ColorInput
            label="Text Color"
            value={getNestedValue('buttons.primary.color')}
            defaultValue={defaults['buttons.primary.color']}
            onChange={(v) => {
              updateThemeValue('buttons.primary.color', v)
              updateThemeValue('buttons.primary.hover.color', v)
            }}
            onClear={() => {
              updateThemeValue('buttons.primary.color', undefined)
              updateThemeValue('buttons.primary.hover.color', undefined)
            }}
          />

          <SubLabel>Secondary (hover auto-derived)</SubLabel>

          <ColorInput
            label="Background"
            value={getNestedValue('buttons.secondary.background')}
            defaultValue={defaults['buttons.secondary.background']}
            onChange={(v) =>
              setWithHover(
                'buttons.secondary.background',
                'buttons.secondary.hover.background',
                v
              )
            }
            onClear={() =>
              clearWithHover(
                'buttons.secondary.background',
                'buttons.secondary.hover.background'
              )
            }
          />

          <ColorInput
            label="Text Color"
            value={getNestedValue('buttons.secondary.color')}
            defaultValue={defaults['buttons.secondary.color']}
            onChange={(v) => {
              updateThemeValue('buttons.secondary.color', v)
              updateThemeValue('buttons.secondary.hover.color', v)
            }}
            onClear={() => {
              updateThemeValue('buttons.secondary.color', undefined)
              updateThemeValue('buttons.secondary.hover.color', undefined)
            }}
          />

          {/* CTA italic toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="cta-italic"
              checked={getNestedValue('buttons.cta.fontStyle') === 'italic'}
              onChange={(e) =>
                updateThemeValue(
                  'buttons.cta.fontStyle',
                  e.target.checked ? 'italic' : 'normal'
                )
              }
            />
            <label htmlFor="cta-italic" style={{ fontSize: 13 }}>
              Italic CTA Button
            </label>
          </div>
        </div>

        {/* Surfaces */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${sidebarBorder}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <SectionTitle>Surfaces</SectionTitle>

          <ColorInput
            label="Widget Background"
            value={getNestedValue('widget.background')}
            defaultValue={defaults['widget.background']}
            onChange={(v) => updateThemeValue('widget.background', v)}
            onClear={() => updateThemeValue('widget.background', undefined)}
          />

          <ColorInput
            label="Card Background"
            value={getNestedValue('widget.card.background')}
            defaultValue={defaults['widget.card.background']}
            onChange={(v) => updateThemeValue('widget.card.background', v)}
            onClear={() =>
              updateThemeValue('widget.card.background', undefined)
            }
          />

          <ColorInput
            label="Selector Background"
            value={getNestedValue('widget.selector.background')}
            defaultValue={defaults['widget.selector.background']}
            onChange={(v) =>
              setWithHover(
                'widget.selector.background',
                'widget.selector.hover.background',
                v
              )
            }
            onClear={() =>
              clearWithHover(
                'widget.selector.background',
                'widget.selector.hover.background'
              )
            }
          />

          <ColorInput
            label="Input Background"
            value={getNestedValue('input.background')}
            defaultValue={defaults['input.background']}
            onChange={(v) => updateThemeValue('input.background', v)}
            onClear={() => updateThemeValue('input.background', undefined)}
          />

          <ColorInput
            label="Modal Background"
            value={getNestedValue('modal.background')}
            defaultValue={defaults['modal.background']}
            onChange={(v) => updateThemeValue('modal.background', v)}
            onClear={() => updateThemeValue('modal.background', undefined)}
          />

          <ColorInput
            label="Subtle BG"
            value={getNestedValue('subtleBackgroundColor')}
            defaultValue={defaults['subtleBackgroundColor']}
            onChange={(v) => updateThemeValue('subtleBackgroundColor', v)}
            onClear={() =>
              updateThemeValue('subtleBackgroundColor', undefined)
            }
          />

          <ColorInput
            label="Subtle Border"
            value={getNestedValue('subtleBorderColor')}
            defaultValue={defaults['subtleBorderColor']}
            onChange={(v) => updateThemeValue('subtleBorderColor', v)}
            onClear={() => updateThemeValue('subtleBorderColor', undefined)}
          />

          {/* Border radius */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, fontSize: 13 }}>Border Radius</span>
            <input
              type="range"
              min={0}
              max={24}
              value={(() => {
                const v = parseInt(getNestedValue('widget.card.borderRadius'))
                return isNaN(v) ? 12 : v
              })()}
              onChange={(e) => {
                const val = `${e.target.value}px`
                updateThemeValue('widget.borderRadius', val)
                updateThemeValue('widget.card.borderRadius', val)
                updateThemeValue('modal.borderRadius', val)
                updateThemeValue('input.borderRadius', val)
                updateThemeValue('dropdown.borderRadius', val)
                updateThemeValue('widget.swap.currency.button.borderRadius', val)
                updateThemeValue('buttons.borderRadius', val)
              }}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 11, opacity: 0.5, width: 30 }}>
              {(() => {
                const v = parseInt(getNestedValue('widget.card.borderRadius'))
                return isNaN(v) ? 12 : v
              })()}px
            </span>
          </div>

          {/* Reset all button */}
          <button
            onClick={() => setThemeOverrides({})}
            style={{
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 6,
              border: `1px solid ${sidebarBorder}`,
              background: 'transparent',
              cursor: 'pointer',
              color: sidebarText,
              opacity: 0.7,
              marginTop: 4
            }}
          >
            Reset All Theme
          </button>
        </div>

        {/* Widget Config */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${sidebarBorder}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <SectionTitle>Config</SectionTitle>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="sidebar-single-chain"
              checked={singleChainMode}
              onChange={(e) => setSingleChainMode(e.target.checked)}
            />
            <label htmlFor="sidebar-single-chain" style={{ fontSize: 13 }}>
              Single Chain Mode
            </label>
          </div>

          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>
            Wallet VMs
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px 12px'
            }}
          >
            {WALLET_VM_TYPES.map((vm) => (
              <div
                key={vm}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <input
                  id={`sidebar-vm-${vm}`}
                  type="checkbox"
                  checked={supportedWalletVMs.includes(vm)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSupportedWalletVMs((prev) => [...prev, vm])
                    } else {
                      setSupportedWalletVMs((prev) =>
                        prev.filter((item) => item !== vm)
                      )
                    }
                  }}
                />
                <label
                  htmlFor={`sidebar-vm-${vm}`}
                  style={{ fontSize: 13 }}
                >
                  {vm.toUpperCase()}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Global / Provider Settings */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <SectionTitle>Global</SectionTitle>

        </div>
      </div>
      </div>
    </>
  )
}
