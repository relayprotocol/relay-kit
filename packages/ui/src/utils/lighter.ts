export const lighter = {
  id: 3586256
}

const lighterAddressRegex = /^\d+$/

export function isLighterAddress(address: string): boolean {
  return lighterAddressRegex.test(address)
}

type LighterSubAccount = {
  code: number
  account_type: number
  index: number
  l1_address: string
}

type LighterAccountsResponse = {
  code: number
  l1_address: string
  sub_accounts: LighterSubAccount[]
}

/**
 * Resolves an EVM address to a Lighter account ID (main account).
 */
export async function resolveLighterAddress(
  evmAddress: string
): Promise<string | null> {
  try {
    const url = new URL(
      'https://mainnet.zklighter.elliot.ai/api/v1/accountsByL1Address'
    )
    url.searchParams.set('l1_address', evmAddress)

    const response = await fetch(url.toString())
    if (!response.ok) return null

    const data: LighterAccountsResponse = await response.json()
    if (data.code === 200 && data.sub_accounts?.length > 0) {
      return data.sub_accounts[0].index.toString()
    }
    return null
  } catch {
    return null
  }
}
