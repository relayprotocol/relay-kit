import { useQuery, useQueryClient } from '@tanstack/react-query'

const LIGHTER_API = 'https://mainnet.zklighter.elliot.ai/api/v1/account'

export interface LighterAccount {
  index: number
  l1_address: string
}

/**
 * Looks up a Lighter account by l1_address or numeric index.
 * After fetching, also sets the cache entry for the other key so
 * subsequent lookups in the other direction are instant.
 */
export function useLighterAccount(value: string, enabled = true) {
  const queryClient = useQueryClient()
  const byIndex = /^\d+$/.test(value)

  return useQuery<LighterAccount | null>({
    queryKey: ['lighter-account', value],
    queryFn: async () => {
      const by = byIndex ? 'index' : 'l1_address'
      const res = await fetch(
        `${LIGHTER_API}?by=${by}&value=${encodeURIComponent(value)}`
      )
      if (!res.ok) return null
      const data = await res.json()
      if (
        !data ||
        (data.index === undefined && data.index !== 0) ||
        !data.l1_address
      )
        return null

      const account: LighterAccount = {
        index: data.index,
        l1_address: data.l1_address
      }

      // Populate the reverse-lookup cache entry
      const otherKey = byIndex ? data.l1_address : String(data.index)
      queryClient.setQueryData(['lighter-account', otherKey], account)

      return account
    },
    enabled: enabled && !!value,
    staleTime: 5 * 60 * 1000
  })
}
