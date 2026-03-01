const INTERNAL_SOURCES = ['weth', 'wsol', 'relay-dumb-order-router']

export const swapSourceDisplayNames: Record<string, string> = {
  jupiter: 'Jupiter',
  dflow: 'DFlow',
  sushiswap: 'SushiSwap',
  uniswap: 'Uniswap',
  '0x': '0x Protocol',
  camelot: 'Camelot',
  'open-ocean': 'OpenOcean',
  magpie: 'Magpie',
  odos: 'Odos',
  okxSvm: 'OKX',
  okxEvm: 'OKX',
  bebopPmm: 'Bebop',
  bebopJam: 'Bebop Jam',
  cetus: 'Cetus',
  rooster: 'Rooster',
  eisen: 'Eisen',
  okxSui: 'OKX',
  kyberswap: 'KyberSwap',
  hyperswap: 'HyperSwap',
  pancakeswap: 'PancakeSwap'
}

export const swapSourceLogos: Record<string, string> = {
  jupiter: 'https://station.jup.ag/img/jupiter-logo.svg',
  dflow: 'https://assets.coingecko.com/coins/images/40854/standard/DFlow_Round_200.png',
  sushiswap: 'https://avatars.githubusercontent.com/u/72222929',
  uniswap: 'https://avatars.githubusercontent.com/u/36178986',
  '0x': 'https://avatars.githubusercontent.com/u/24715829',
  camelot: 'https://avatars.githubusercontent.com/u/117427267',
  'open-ocean': 'https://avatars.githubusercontent.com/u/76070938',
  magpie: 'https://avatars.githubusercontent.com/u/120498555',
  odos: 'https://avatars.githubusercontent.com/u/115976977',
  okxSvm: 'https://avatars.githubusercontent.com/u/17aborakl',
  okxEvm: 'https://avatars.githubusercontent.com/u/17aborakl',
  bebopPmm: 'https://avatars.githubusercontent.com/u/124244030',
  bebopJam: 'https://avatars.githubusercontent.com/u/124244030',
  cetus: 'https://avatars.githubusercontent.com/u/108989064',
  rooster: 'https://rooster.fi/favicon.ico',
  eisen: 'https://eisen.finance/favicon.ico',
  okxSui: 'https://avatars.githubusercontent.com/u/17aborakl',
  kyberswap: 'https://avatars.githubusercontent.com/u/45009994',
  hyperswap: 'https://hyperswap.exchange/favicon.ico',
  pancakeswap: 'https://avatars.githubusercontent.com/u/71082489'
}

export function formatSourceName(source: string): string {
  return swapSourceDisplayNames[source] ?? source
}

export function isInternalSource(source: string): boolean {
  return INTERNAL_SOURCES.includes(source)
}
