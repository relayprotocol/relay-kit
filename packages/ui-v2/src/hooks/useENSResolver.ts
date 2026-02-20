import { useQuery } from '@tanstack/react-query'

interface ENSResolveResult {
  address: string
  name: string
  shortName: string
  displayName: string
  shortAddress: string
  avatar: string | null
}

/**
 * Resolves an ENS name or address via the ensideas API.
 * Returns address, display name, and avatar info.
 * Results are cached for 5 minutes.
 */
export function useENSResolver(input: string, enabled = true) {
  return useQuery<ENSResolveResult | null>({
    queryKey: ['ens-resolve', input],
    queryFn: async () => {
      if (!input) return null
      const res = await fetch(
        `https://api.ensideas.com/ens/resolve/${encodeURIComponent(input)}`
      )
      if (!res.ok) return null
      const data = await res.json()
      if (!data?.address) return null
      return data as ENSResolveResult
    },
    enabled: enabled && !!input,
    staleTime: 5 * 60 * 1000
  })
}
