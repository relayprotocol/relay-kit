import {
  useQuery,
  type DefaultError,
  type QueryKey
} from '@tanstack/react-query'

interface TronAccountResource {
  latest_consume_time_for_energy: number
  energy_window_size: number
  energy_window_optimized: boolean
}

interface TronPermissionKey {
  address: string
  weight: number
}

interface TronOwnerPermission {
  permission_name: string
  threshold: number
  keys: TronPermissionKey[]
}

interface TronActivePermission {
  type: string
  id: number
  permission_name: string
  threshold: number
  operations: string
  keys: TronPermissionKey[]
}

interface TronFrozenV2 {
  type?: 'ENERGY' | 'TRON_POWER'
}

interface TronUnfrozenV2 {
  type: 'ENERGY' | 'TRON_POWER'
  unfreeze_amount: number
  unfreeze_expire_time: number
}

interface TronAssetV2 {
  key: string
  value: number
}

interface TronFreeAssetNetUsageV2 {
  key: string
  value: number
}

interface TronAccountResponse {
  address: string
  balance: number
  create_time: number
  latest_opration_time: number
  allowance: number
  latest_consume_free_time: number
  net_window_size: number
  net_window_optimized: boolean
  account_resource: TronAccountResource
  owner_permission: TronOwnerPermission
  active_permission: TronActivePermission[]
  frozenV2: TronFrozenV2[]
  unfrozenV2: TronUnfrozenV2[]
  assetV2: TronAssetV2[]
  free_asset_net_usageV2: TronFreeAssetNetUsageV2[]
  asset_optimized: boolean
}

type QueryType = typeof useQuery<
  { balance: bigint } | undefined,
  DefaultError,
  { balance: bigint } | undefined,
  QueryKey
>
type QueryOptions = Parameters<QueryType>['0']

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const ALPHABET_MAP: Record<string, number> = Object.fromEntries(
  Array.from(ALPHABET).map((c, i) => [c, i])
)

async function tronBase58ToHex20Async(
  addrBase58: string
): Promise<`0x${string}`> {
  const payload = await decodeBase58CheckAsync(addrBase58)
  if (payload.length !== 21 || payload[0] !== 0x41)
    throw new Error('Invalid TRON address payload')
  const hex = [...payload.slice(1)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return ('0x' + hex) as `0x${string}`
}

async function decodeBase58CheckAsync(b58: string): Promise<Uint8Array> {
  let bytes: number[] = [0]
  for (const ch of b58) {
    const val = ALPHABET_MAP[ch]
    if (val === undefined) throw new Error('Invalid base58 char')
    let carry = val
    for (let i = 0; i < bytes.length; i++) {
      const x = bytes[i] * 58 + carry
      bytes[i] = x & 0xff
      carry = x >> 8
    }
    while (carry) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  for (const ch of b58) {
    if (ch !== '1') break
    bytes.push(0)
  }
  bytes = bytes.reverse()
  if (bytes.length < 4) throw new Error('Too short for checksum')
  const payload = new Uint8Array(bytes.slice(0, -4))
  const checksum = bytes.slice(-4)

  const d1 = await crypto.subtle.digest('SHA-256', payload)
  const d2 = await crypto.subtle.digest('SHA-256', d1)
  const calc = new Uint8Array(d2).slice(0, 4)
  if (!checksum.every((b, i) => b === calc[i]))
    throw new Error('Invalid base58 checksum')
  return payload
}

function pad32(hexNo0x: string): string {
  return hexNo0x.padStart(64, '0')
}

export default (
  address?: string,
  currency?: string,
  queryOptions?: Partial<QueryOptions>
) => {
  const rpcUrl = 'https://api.trongrid.io'
  const trxAddress = 'TXuo7BWT6hDdotW8LPPeiShe1KHUFzB6hJ'

  const queryKey = ['useTronBalance', address, currency]

  const response = (useQuery as QueryType)({
    queryKey,
    queryFn: async () => {
      if (address) {
        if (currency === trxAddress || !currency) {
          const response = await fetch(`${rpcUrl}/walletsolidity/getaccount`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              address,
              visible: true
            })
          })

          const data = await response.json()

          if (data.error) {
            throw new Error(data.error.message)
          }

          const result = data.result as TronAccountResponse

          return {
            balance: BigInt(result.balance ?? 0)
          }
        } else {
          const owner20 = await tronBase58ToHex20Async(address)
          const parameter = pad32(owner20.slice(2))

          const res = await fetch(
            `${rpcUrl}/walletsolidity/triggerconstantcontract`,
            {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                owner_address: address,
                contract_address: currency,
                function_selector: 'balanceOf(address)',
                parameter,
                visible: true
              })
            }
          )
          const data = await res.json()

          if (data.error) {
            throw new Error(data.error.message)
          }

          const hex = data?.constant_result?.[0] as string | undefined

          return {
            balance: BigInt('0x' + hex)
          }
        }
      }
    },
    enabled: address !== undefined,
    ...queryOptions
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
