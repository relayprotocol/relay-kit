/**
 * Ensure that an Ethereum address does not overflow
 * by removing the middle characters
 * @param address An Ethereum address
 * @param shrinkInidicator Visual indicator to show address is only
 * partially displayed
 * @returns A shrinked version of the Ethereum address
 * with the middle characters removed.
 */
function truncateAddress(
  address?: string,
  shrinkInidicator?: string,
  firstSectionLength?: number,
  lastSectionLength?: number
) {
  if (!address) return address

  const firstLength = firstSectionLength ?? 4
  const lastLength = lastSectionLength ?? 4
  const minLength = firstLength + lastLength + 1

  // Only truncate if the address is longer than what the truncated version would be
  if (address.length <= minLength) return address

  return (
    address.slice(0, firstLength) +
    (shrinkInidicator || '…') +
    address.slice(-lastLength)
  )
}

function truncateEns(ensName: string, shrinkInidicator?: string) {
  if (ensName.length < 24) return ensName

  return ensName.slice(0, 20) + (shrinkInidicator || '…') + ensName.slice(-3)
}

export { truncateAddress, truncateEns }
