import type { paths } from '@relayprotocol/relay-sdk'

export type UserTransactionsResponse =
  paths['/requests/v2']['get']['responses']['200']['content']['application/json']

export type RelayTransaction = NonNullable<
  NonNullable<UserTransactionsResponse>['requests']
>[0]
