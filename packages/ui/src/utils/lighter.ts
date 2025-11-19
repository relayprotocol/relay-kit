export const lighter = {
  id: 3586256
}

const lighterAddressRegex = /^\d+$/

export function isLighterAddress(address: string): boolean {
  return lighterAddressRegex.test(address)
}
