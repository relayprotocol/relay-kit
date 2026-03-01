import { getRelayUiKitData, setRelayUiKitData } from './localStorage.js'

export function getExcludedSwapSources(): string[] {
  const data = getRelayUiKitData()
  return data.excludedSwapSources ?? []
}

export function setExcludedSwapSources(sources: string[]): void {
  setRelayUiKitData({ excludedSwapSources: sources })
}

export function toggleSwapSource(source: string): void {
  const excluded = getExcludedSwapSources()
  if (excluded.includes(source)) {
    setExcludedSwapSources(excluded.filter((s) => s !== source))
  } else {
    setExcludedSwapSources([...excluded, source])
  }
}

export function getCustomRpcOverrides(): Record<number, string> {
  const data = getRelayUiKitData()
  return data.customRpcOverrides ?? {}
}

export function setCustomRpcOverride(chainId: number, rpcUrl: string): void {
  const overrides = getCustomRpcOverrides()
  overrides[chainId] = rpcUrl
  setRelayUiKitData({ customRpcOverrides: overrides })
}

export function removeCustomRpcOverride(chainId: number): void {
  const overrides = getCustomRpcOverrides()
  delete overrides[chainId]
  setRelayUiKitData({ customRpcOverrides: overrides })
}
