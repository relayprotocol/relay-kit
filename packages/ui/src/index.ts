//theming
export type { RelayKitTheme } from './themes/RelayKitTheme.js'
export { defaultTheme } from './themes/index.js'

//Providers
export { RelayKitProvider } from './providers/RelayKitProvider.js'
export { RelayClientProvider } from './providers/RelayClientProvider.js'

//hooks
export { default as useRelayClient } from './hooks/useRelayClient.js'

//widgets
export { default as SwapWidget } from './components/widgets/SwapWidget/index.js'
export type { SwapWidgetProps } from './components/widgets/SwapWidget/index.js'
export { TokenWidget } from './components/widgets/TokenWidget/index.js'
export type { TokenWidgetProps } from './components/widgets/TokenWidget/index.js'

//components
export { default as TokenSelector } from './components/common/TokenSelector/TokenSelector.js'
export { SlippageToleranceConfig } from './components/common/SlippageToleranceConfig.js'
export { DepositAddressModal } from './components/common/TransactionModal/DepositAddressModal.js'

//types
export type { LinkedWallet, Token } from './types/index.js'
