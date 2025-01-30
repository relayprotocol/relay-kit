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

//components
export { default as TokenSelector } from './components/common/TokenSelector/TokenSelector.js'
export { DepositAddressModal } from './components/common/TransactionModal/DepositAddressModal.js'

//types
export type { LinkedWallet } from './types/index.js'
