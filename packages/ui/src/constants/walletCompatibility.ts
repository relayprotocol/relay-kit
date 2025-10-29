export const WalletChainRestricted: Record<string, number[]> = {
  phantom: [1, 8453, 792703809, 137, 8253038, 101, 10143],
  backpack: [1, 8453, 137, 42161, 10, 10143, 80094, 9286185, 792703809],
  magiceden: [
    1, 137, 8453, 33139, 8253038, 792703809, 1329, 2741, 42161, 80094, 56, 43114
  ],
  uniswap: [
    1, 130, 42161, 43114, 8453, 81457, 56, 42220, 10, 137, 480, 324, 7777777
  ],
  abstract: [2741],
  ronin: [1, 56, 137, 42161, 8453, 2020],
  porto: [8453, 42161, 56, 42220, 1, 10, 137]
}

export const WalletChainIncompatible: Record<string, number[]> = {
  binance: [7777777, 8453],
  binanceus: [7777777, 8453]
}

export const NormalizedWalletName: Record<string, string> = {
  phantomevm: 'phantom',
  phantomsui: 'phantom',
  phantombtc: 'phantom',
  magicedensol: 'magiceden',
  roninwallet: 'ronin',
  portoevm: 'porto',
  surfwalletsui: 'surf',
  trusttron: 'trust'
}
