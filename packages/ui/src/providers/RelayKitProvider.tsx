import { createContext, useMemo } from 'react'
import type { FC, ReactElement, ReactNode } from 'react'
import { RelayClientProvider } from './RelayClientProvider.js'
import type { RelayClientOptions, paths } from '@relayprotocol/relay-sdk'
import type { RelayKitTheme } from '../themes/index.js'
import { generateCssVars } from '../utils/theme.js'

export type AppFees =
  paths['/quote']['post']['requestBody']['content']['application/json']['appFees']

type RelayKitProviderOptions = {
  /**
   * The name of the application
   */
  appName?: string
  /**
   * An array of fee objects composing of a recipient address and the fee in BPS
   */
  appFees?: AppFees
  duneConfig?: {
    /**
     * The base url for the dune api, if omitted the default will be used. Override this config to protect your api key via a proxy.
     */
    apiBaseUrl?: string
    /**
     * This key is used to fetch token balances, to improve the general UX and suggest relevant tokens
     * Can be omitted and the ui will continue to function. Refer to the dune docs on how to get an api key
     */
    apiKey?: string
  }
  /**
   * An objecting mapping either a VM type (evm, svm, bvm) or a chain id to a connector key (metamask, backpacksol, etc).
   * Connector keys are used for differentiating which wallet maps to which vm/chain.
   * Only relevant for eclipse/solana at the moment.
   */
  vmConnectorKeyOverrides?: {
    [key in number | 'evm' | 'svm' | 'bvm']?: string[]
  }
  /**
   * An array of private chain ids to be used when querying the chains api within relay kit.
   */
  privateChainIds?: string[]
  /**
   * The icon theme to use for the chain icons. Defaults to light.
   */
  themeScheme?: 'dark' | 'light'
  /**
   * The loader to use for the loading spinner. Defaults to relay.
   */
  loader?: (options?: {
    width?: number | string
    height?: number | string
    fill?: string
  }) => ReactElement
  /**
   * The secure base url for the relay api, if omitted the default will be used. Override this config to protect your api key via a proxy.
   * Currently only relevant for the quote api in the SwapWidget
   */
  secureBaseUrl?: string
}

export interface RelayKitProviderProps {
  children: ReactNode
  options: RelayClientOptions & RelayKitProviderOptions
  theme?: RelayKitTheme
}

export const ProviderOptionsContext = createContext<RelayKitProviderOptions>({})

export type ThemeOverridesMap = {
  [key: string]: string | ThemeOverridesMap
}

export const themeOverrides: ThemeOverridesMap = {
  font: '--relay-fonts-body',
  fontHeading: '--relay-fonts-heading',
  primaryColor: '--relay-colors-primary-color',
  focusColor: '--relay-colors-focus-color',
  subtleBackgroundColor: '--relay-colors-subtle-background-color',
  subtleBorderColor: '--relay-colors-subtle-border-color',
  text: {
    default: '--relay-colors-text-default',
    subtle: '--relay-colors-text-subtle',
    error: '--relay-colors-text-error',
    success: '--relay-colors-text-success'
  },
  buttons: {
    primary: {
      color: '--relay-colors-primary-button-color',
      background: '--relay-colors-primary-button-background',
      hover: {
        color: '--relay-colors-primary-button-hover-color',
        background: '--relay-colors-primary-button-hover-background'
      }
    },
    secondary: {
      color: '--relay-colors-secondary-button-color',
      background: '--relay-colors-secondary-button-background',
      hover: {
        color: '--relay-colors-secondary-button-hover-color',
        background: '--relay-colors-secondary-button-hover-background'
      }
    },
    white: {
      color: '--relay-colors-primary-button-color',
      background: '--relay-colors-primary-button-background',
      hover: {
        color: '--relay-colors-primary-button-hover-color',
        background: '--relay-colors-primary-button-hover-background'
      }
    },
    disabled: {
      color: '--relay-colors-button-disabled-color',
      background: '--relay-colors-button-disabled-background'
    }
  },
  input: {
    background: '--relay-colors-input-background',
    borderRadius: '--relay-radii-input-border-radius',
    color: '--relay-colors-input-color'
  },
  skeleton: {
    background: '--relay-colors-skeleton-background'
  },
  anchor: {
    color: '--relay-colors-anchor-color',
    hover: {
      color: '--relay-colors-anchor-hover-color'
    }
  },
  dropdown: {
    background: '--relay-colors-dropdown-background',
    borderRadius: '--relay-radii-dropdown-border-radius',
    border: '--relay-borders-dropdown-border'
  },
  widget: {
    background: '--relay-colors-widget-background',
    borderRadius: '--relay-radii-widget-border-radius',
    border: '--relay-borders-widget-border',
    boxShadow: '--relay-shadows-widget-box-shadow',
    card: {
      background: '--relay-colors-widget-card-background',
      borderRadius: '--relay-radii-widget-card-border-radius',
      border: '--relay-borders-widget-card-border',
      gutter: '--relay-spacing-widget-card-section-gutter'
    },
    selector: {
      background: '--relay-colors-widget-selector-background',
      hover: {
        background: '--relay-colors-widget-selector-hover-background'
      }
    },
    swapCurrencyButtonBorderColor:
      '--relay-colors-widget-swap-currency-button-border-color',
    swapCurrencyButtonBorderWidth:
      '--relay-borders-widget-swap-currency-button-border-width',
    swapCurrencyButtonBorderRadius:
      '--relay-radii-widget-swap-currency-button-border-radius'
  },
  modal: {
    background: '--relay-colors-modal-background',
    borderRadius: '--relay-radii-modal-border-radius',
    border: '--relay-borders-modal-border'
  }
}

export const RelayKitProvider: FC<RelayKitProviderProps> = function ({
  children,
  options,
  theme
}: RelayKitProviderProps): JSX.Element {
  const providerOptions = useMemo(
    () => ({
      appName: options.appName,
      appFees: options.appFees,
      duneConfig: options.duneConfig,
      vmConnectorKeyOverrides: options.vmConnectorKeyOverrides,
      privateChainIds: options.privateChainIds,
      themeScheme: options.themeScheme,
      loader: options.loader,
      secureBaseUrl: options.secureBaseUrl
    }),
    [options]
  )

  // Generate the CSS variable declarations
  const cssVariables = useMemo(
    () => generateCssVars(theme, themeOverrides),
    [theme]
  )

  return (
    <ProviderOptionsContext.Provider value={providerOptions}>
      <RelayClientProvider options={options}>
        <style
          dangerouslySetInnerHTML={{
            __html: `.relay-kit-reset {
              ${cssVariables}
            }`
          }}
        />
        {children}
      </RelayClientProvider>
    </ProviderOptionsContext.Provider>
  )
}
