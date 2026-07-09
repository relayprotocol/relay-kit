import type { RelayChain } from '@relayprotocol/relay-sdk'
import getChainBlockExplorerUrl from './getChainBlockExplorerUrl.js'

const appendQueryParams = (
  url: string,
  params?: Record<string, any> | null
) => {
  if (params) {
    const queryParams = new URLSearchParams(params)
    return `${url}?${queryParams.toString()}`
  }
  return url
}

export function getTxBlockExplorerUrl(
  chainId?: number,
  chains?: RelayChain[],
  txHash?: string
) {
  const chain = chains?.find((chain) => chain.id === chainId)
  let blockExplorerUrl = getChainBlockExplorerUrl(chainId, chains)

  if (txHash) {
    if (chain?.explorerPaths?.transaction) {
      blockExplorerUrl = `${blockExplorerUrl}${chain.explorerPaths.transaction.replace('{TX_HASH}', txHash)}`
    } else {
      blockExplorerUrl = `${blockExplorerUrl}/tx/${txHash}`
    }
  }

  blockExplorerUrl = appendQueryParams(
    blockExplorerUrl,
    chain?.explorerQueryParams
  )

  return blockExplorerUrl
}
