import {
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type FC,
  type ReactNode
} from 'react'
import {
  adaptViemWallet,
  type Order,
  type OrderStatus
} from '@relayprotocol/relay-sdk'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import {
  useRelayChains,
  useTokenList,
  useTokenPrice
} from '@relayprotocol/relay-kit-hooks'
import { formatUnits, zeroAddress, type WalletClient } from 'viem'
import css from './orders.module.css'

export const OPEN_STATUSES: OrderStatus[] = [
  'pending',
  'open',
  'processing',
  'requires_action'
]
export const ALL_STATUSES: OrderStatus[] = [...OPEN_STATUSES, 'closed']

export type TokenRef = { chainId: number; address: string }

export type TokenMeta = {
  chainId: number
  address: string
  symbol?: string
  name?: string
  decimals?: number
  logoURI?: string
  verified?: boolean
}

export const chainIcon = (chainId: number) =>
  `https://assets.relay.link/icons/square/${chainId}/light.png`

/** Orders only take ERC-20 tokens; native currencies must use their wrapped token */
export const isNativeToken = ({ address }: TokenRef) =>
  address.toLowerCase() === zeroAddress

export const tokenKey = ({ chainId, address }: TokenRef) =>
  `${chainId}:${address.toLowerCase()}`

type SolverChains = {
  id?: number
  solverCurrencies?: { address?: string }[]
}[]

/**
 * The Relay API's `/chains`, fetched through the page's API base (the orders
 * proxy), for each chain's `solverCurrencies`. Undefined until it loads.
 */
export function useSolverChains(): SolverChains | undefined {
  const client = useRelayClient()
  return useRelayChains(client?.baseApiUrl, undefined, {
    enabled: Boolean(client),
    staleTime: 5 * 60_000
  }).data?.chains
}

/** ERC-20 currencies the solver holds on a chain, as {@link tokenKey}s */
export const solverTokenKeys = (chains: SolverChains, chainId: number) =>
  chains
    .find((chain) => chain.id === chainId)
    ?.solverCurrencies?.flatMap(({ address }) =>
      address && !isNativeToken({ chainId, address })
        ? [tokenKey({ chainId, address })]
        : []
    ) ?? []

/** Buy targets and settlement currencies must be held by the solver */
export const isSolverToken = (chains: SolverChains, token: TokenRef) =>
  solverTokenKeys(chains, token.chainId).includes(tokenKey(token))

const isAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value)

/** Token metadata from the Relay API's currencies/v2, keyed by {@link tokenKey} */
export function useTokensMeta(tokens: TokenRef[]) {
  const client = useRelayClient()
  const keys = useMemo(
    () =>
      [
        ...new Set(
          tokens
            .filter((token) => token.chainId && isAddress(token.address))
            .map(tokenKey)
        )
      ].sort(),
    [tokens]
  )
  const { data, isFetching } = useTokenList(
    client?.baseApiUrl,
    keys.length ? { tokens: keys, limit: keys.length } : undefined,
    { enabled: Boolean(client && keys.length), staleTime: Infinity }
  )
  const meta = useMemo(() => {
    const byKey: Record<string, TokenMeta> = {}
    data?.forEach((currency) => {
      if (!currency.chainId || !currency.address) return
      byKey[tokenKey(currency as TokenRef)] = {
        chainId: currency.chainId,
        address: currency.address,
        symbol: currency.symbol,
        name: currency.name,
        decimals: currency.decimals,
        logoURI: currency.metadata?.logoURI,
        verified: currency.metadata?.verified
      }
    })
    return byKey
  }, [data])
  return { meta, isFetching, requested: keys }
}

/** USD price from the Relay API's currencies/token/price/v2 */
export function useUsdPrice(token: TokenRef) {
  const client = useRelayClient()
  const valid = Boolean(token.chainId && isAddress(token.address))
  const { data } = useTokenPrice(
    client?.baseApiUrl,
    { chainId: token.chainId, address: token.address },
    { enabled: Boolean(client) && valid, refetchInterval: 15_000 }
  )
  const price = Number(data?.price)
  return valid && Number.isFinite(price) && price > 0 ? price : undefined
}

/**
 * Switch the wallet to the chain the order's steps run on before executing
 * them, as the swap widget does before executing a quote
 */
export const switchWalletChain = async (
  wallet: WalletClient,
  chainId: number
) => {
  if ((await wallet.getChainId()) !== chainId) {
    await adaptViemWallet(wallet).switchChain(chainId)
  }
}

/** A plain decimal string (no exponent), as the API expects for prices */
export const toDecimalString = (value: number, significantDigits = 6) =>
  value.toLocaleString('en-US', {
    useGrouping: false,
    maximumSignificantDigits: significantDigits
  })

export const formatNumber = (value: number, significantDigits = 6) =>
  value.toLocaleString('en-US', { maximumSignificantDigits: significantDigits })

export const formatBaseUnits = (amount: string, meta?: TokenMeta) => {
  if (meta?.decimals === undefined) return `${amount} (base units)`
  try {
    return `${formatNumber(
      Number(formatUnits(BigInt(amount), meta.decimals))
    )} ${meta.symbol ?? ''}`.trim()
  } catch {
    return amount
  }
}

export const shortHex = (value: string, size = 6) =>
  value.length > size * 2 + 2
    ? `${value.slice(0, size + 2)}…${value.slice(-size)}`
    : value

export type ErrorInfo = { message: string; errorCode?: string; raw?: unknown }

/** Orders errors carry their code in `rawError.errorCode`; statusCode is unreliable */
export const errorInfo = (error: any): ErrorInfo => ({
  message: error?.shortMessage ?? error?.message ?? String(error),
  errorCode: error?.rawError?.errorCode,
  raw: error?.rawError
})

export const cx = (...names: (string | false | undefined)[]) =>
  names.filter(Boolean).join(' ')

const BADGE_COLORS: Record<string, string> = {
  pending: 'var(--relay-colors-amber11)',
  open: 'var(--relay-colors-blue-11)',
  processing: 'var(--relay-colors-primary11)',
  requires_action: 'var(--relay-colors-red11)',
  closed: 'var(--relay-colors-gray11)',
  filled: 'var(--relay-colors-green11)',
  refunded: 'var(--relay-colors-amber11)',
  withdrawn: 'var(--relay-colors-blue-11)',
  cancelled: 'var(--relay-colors-gray11)',
  expired: 'var(--relay-colors-gray11)',
  failed: 'var(--relay-colors-red11)',
  warning: 'var(--relay-colors-red11)'
}

export const Badge = ({ value, tone }: { value: string; tone?: string }) => (
  <span
    className={css.badge}
    style={
      {
        '--badge': BADGE_COLORS[tone ?? value] ?? 'var(--relay-colors-gray11)'
      } as CSSProperties
    }
  >
    {value}
  </span>
)

export const Json = ({ value }: { value: unknown }) => (
  <pre className={css.pre}>
    {JSON.stringify(
      value,
      (_, item) => (typeof item === 'bigint' ? item.toString() : item),
      2
    )}
  </pre>
)

const UNFILLABLE_REASONS = [
  'insufficient_balance',
  'insufficient_allowance',
  'no_route'
]

export const orderTokens = (order: Order): TokenRef[] => [
  { chainId: order.targetChainId, address: order.targetCurrency },
  { chainId: order.settlementChainId, address: order.settlementCurrency }
]

/** Metadata of the token the order spends: the target for a sell, the settlement for a buy */
export const spentMeta = (order: Order, meta: Record<string, TokenMeta>) =>
  meta[tokenKey(orderTokens(order)[order.side === 'sell' ? 0 : 1])]

/** How far the market must move to reach the target price, in % */
export const distanceToTarget = (order: Order) => {
  const market = Number(order.latestCheck?.marketPrice)
  const target = Number(order.targetPrice)
  return market > 0 && target > 0
    ? ((target - market) / market) * 100
    : undefined
}

export const fillProgress = (order: Order) => {
  try {
    const amount = BigInt(order.amount)
    return amount > 0n
      ? Number((BigInt(order.filledAmount) * 10000n) / amount) / 100
      : 0
  } catch {
    return 0
  }
}

/** The order's warning, if a price check says it can't fill or it needs action */
export const unfillableReason = (order: Order) =>
  order.status === 'requires_action'
    ? 'needs action'
    : order.status !== 'closed' &&
        UNFILLABLE_REASONS.includes(order.latestCheck?.reason ?? '')
      ? order.latestCheck!.reason!
      : undefined

/** Time left until `iso`, such as "6d 23h 59m" */
export const formatTimeLeft = (iso: string) => {
  const minutes = Math.floor((new Date(iso).getTime() - Date.now()) / 60000)
  if (minutes <= 0) return undefined
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  return [
    days && `${days}d`,
    (days || hours) && `${hours}h`,
    `${minutes % 60}m`
  ]
    .filter(Boolean)
    .join(' ')
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting signature',
  open: 'Limit open',
  processing: 'Filling',
  requires_action: 'Needs action'
}

export const statusLabel = (order: Order) =>
  order.status === 'closed'
    ? `Limit ${order.outcome ?? 'closed'}`
    : STATUS_LABELS[order.status]

/**
 * What the order spends and what it receives at its target price, with the
 * order's USD value. Settlement amounts need the settlement token's USD price.
 */
export const orderSides = (
  order: Order,
  meta: Record<string, TokenMeta>,
  settlementUsd?: number
) => {
  const [target, settlement] = orderTokens(order)
  const sell = order.side === 'sell'
  const pay = sell ? target : settlement
  const receive = sell ? settlement : target
  const payMeta = meta[tokenKey(pay)]
  const price = Number(order.targetPrice)
  const payAmount =
    payMeta?.decimals !== undefined
      ? Number(formatUnits(BigInt(order.amount), payMeta.decimals))
      : undefined
  const valueUsd =
    payAmount === undefined
      ? undefined
      : sell
        ? payAmount * price
        : settlementUsd && payAmount * settlementUsd
  const receiveAmount =
    valueUsd === undefined
      ? undefined
      : sell
        ? settlementUsd && valueUsd / settlementUsd
        : valueUsd / price
  return {
    pay: { token: pay, meta: payMeta, amount: payAmount },
    receive: {
      token: receive,
      meta: meta[tokenKey(receive)],
      amount: receiveAmount || undefined
    },
    valueUsd: valueUsd || undefined
  }
}

/** A native dialog; without `onClose` it can't be dismissed */
export const Modal: FC<{
  open: boolean
  label: string
  onClose?: () => void
  children: ReactNode
}> = ({ open, label, onClose, children }) => {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])
  return (
    <dialog
      ref={dialog}
      className={css.modal}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault()
        onClose?.()
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose?.()
      }}
    >
      {open && children}
    </dialog>
  )
}

export const formatDistance = (distance?: number) =>
  distance === undefined
    ? undefined
    : `${distance >= 0 ? '+' : ''}${distance.toFixed(2)}% to target`
