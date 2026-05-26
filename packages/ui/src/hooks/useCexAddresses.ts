import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'

export type CEXAddressesResponse = {
  addresses: string[]
}

type QueryType = typeof useQuery<
  CEXAddressesResponse,
  DefaultError,
  CEXAddressesResponse,
  QueryKey
>

export default () => {
  const queryKey = ['useCexAddresses']

  const response = (useQuery as QueryType)({
    queryKey: queryKey,
    queryFn: () => {
      const url = new URL(
        `https://assets.relay.link/app/cexAddresses.json`
      )

      return fetch(url.href)
        .then((response) => response.json())
        .then((response) => {
          return response
        })
    },
    staleTime: 1000 * 60 * 60 * 24, //24 hours
    gcTime: 1000 * 60 * 60 * 24 //24 hours
  })

  return response
}
