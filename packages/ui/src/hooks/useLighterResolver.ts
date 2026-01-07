import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'
import { resolveLighterAddress } from '../utils/lighter.js'

type LighterResolverResponse = {
  address: string | null
}

type QueryType = typeof useQuery<
  LighterResolverResponse,
  DefaultError,
  LighterResolverResponse,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

export default (evmAddress?: string, queryOptions?: Partial<QueryOptions>) => {
  return (useQuery as QueryType)({
    queryKey: ['useLighterResolver', evmAddress],
    queryFn: async () => {
      const address = await resolveLighterAddress(evmAddress!)
      return { address }
    },
    ...queryOptions,
    enabled:
      evmAddress && evmAddress.length > 0
        ? queryOptions?.enabled !== undefined
          ? queryOptions.enabled
          : true
        : false
  })
}
