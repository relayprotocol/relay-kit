import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'

const SOLANA_NATIVE_ADDRESS = '11111111111111111111111111111111'

type BalanceResponse = {
  balance: bigint
}

type TokenAccount = {
  account?: {
    data?: {
      parsed?: {
        info?: {
          tokenAmount?: {
            amount?: string
          }
        }
      }
    }
  }
}

type QueryType = typeof useQuery<
  BalanceResponse | undefined,
  DefaultError,
  BalanceResponse | undefined,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

export default (
  address?: string,
  currency?: string,
  rpcUrl?: string,
  queryOptions?: Partial<QueryOptions>
) => {
  const queryKey = ['useSolanaBalance', address, currency, rpcUrl]

  const response = (useQuery as QueryType)({
    queryKey,
    queryFn: async () => {
      if (!rpcUrl || !address || !currency) {
        throw new Error('Missing address, currency or rpcUrl')
      }

      const isNative = currency === SOLANA_NATIVE_ADDRESS
      const payload = isNative
        ? {
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [address]
          }
        : {
            jsonrpc: '2.0',
            id: 1,
            method: 'getTokenAccountsByOwner',
            params: [address, { mint: currency }, { encoding: 'jsonParsed' }]
          }

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message)
      }

      if (isNative) {
        return {
          balance: BigInt(data.result?.value ?? 0)
        }
      }

      const accounts = (data.result?.value ?? []) as TokenAccount[]
      const balance = accounts.reduce(
        (total, account) =>
          total +
          BigInt(
            account?.account?.data?.parsed?.info?.tokenAmount?.amount ?? 0
          ),
        BigInt(0)
      )

      return { balance }
    },
    ...queryOptions,
    enabled:
      address !== undefined &&
      currency !== undefined &&
      rpcUrl !== undefined &&
      (queryOptions?.enabled ?? true)
  })

  return {
    ...response,
    balance: response.data?.balance,
    queryKey
  } as ReturnType<QueryType> & {
    balance: bigint | undefined
    queryKey: (string | undefined)[]
  }
}
