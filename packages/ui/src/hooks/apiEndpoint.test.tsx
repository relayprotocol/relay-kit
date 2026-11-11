import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { createClient } from '@relayprotocol/relay-sdk'
import {
  useDepositAddressStatus,
  useExecutionStatus,
  useQuote,
  useRequests,
  useTokenList,
  useTokenPrice,
  useTrendingCurrencies
} from '../../../hooks/src/index.js'

const API_A = 'https://relay.test/a'
const API_B = 'https://relay.test/b'
const originalAdapter = axios.defaults.adapter
const clients: QueryClient[] = []
const requests: URL[] = []

const reply = (url: URL) => {
  requests.push(url)
  const endpoint = url.pathname.startsWith('/a/') ? 'A' : 'B'
  if (url.pathname.endsWith('/requests/v3')) {
    const continuation = url.searchParams.get('continuation')
    if (continuation && continuation !== `${endpoint}-next`) {
      throw new Error(`Cursor crossed API endpoints: ${url}`)
    }
    return {
      requests: [
        { id: `${endpoint}${continuation ? '2' : '1'}`, status: 'pending' }
      ],
      continuation: continuation ? null : `${endpoint}-next`
    }
  }
  if (url.pathname.endsWith('/currencies/v2')) {
    return [{ chainId: 1, address: '0x0', symbol: endpoint, name: endpoint }]
  }
  if (url.pathname.endsWith('/currencies/token/price/v2')) {
    return { price: endpoint === 'A' ? '1' : '2' }
  }
  if (url.pathname.endsWith('/currencies/trending')) {
    return [{ chainId: 1, address: '0x0', symbol: endpoint }]
  }
  if (url.pathname.endsWith('/quote/v2')) {
    return { steps: [], details: { operation: endpoint } }
  }
  if (url.pathname.endsWith('/intents/status/v2')) {
    return { status: endpoint === 'A' ? 'pending' : 'success' }
  }
  throw new Error(`Unexpected request: ${url}`)
}

beforeEach(() => {
  requests.length = 0
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) =>
    Response.json(reply(new URL(input.toString())))
  )
  // Replace only Axios's HTTP transport, not the production query functions.
  axios.defaults.adapter = async (config) => ({
    data: reply(new URL(config.url!)),
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  })
})

afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  axios.defaults.adapter = originalAdapter
  vi.unstubAllGlobals()
})

const mount = (Consumer: ({ base }: { base: string }) => React.ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } }
  })
  clients.push(client)
  const view = (base: string) => (
    <QueryClientProvider client={client}>
      <Consumer base={base} />
    </QueryClientProvider>
  )
  const mounted = render(view(API_A))
  return { client, switchTo: (base: string) => mounted.rerender(view(base)) }
}

function History({ base }: { base: string }) {
  const query = useRequests({ limit: 1 }, base)
  return (
    <>
      <output>{query.data.map((request) => request.id).join(',')}</output>
      <button onClick={() => query.fetchNextPage()}>Next</button>
    </>
  )
}

describe('API endpoint cache isolation', () => {
  it('loads fresh history when a mounted consumer switches endpoint', async () => {
    const { switchTo } = mount(History)
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('A1')
    )

    switchTo(API_B)

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('B1')
    )
  })

  it('keeps history pages and continuation cursors local to each endpoint', async () => {
    const { switchTo } = mount(History)
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('A1')
    )
    fireEvent.click(screen.getByText('Next'))
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('A1,A2')
    )

    switchTo(API_B)
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('B1')
    )
    fireEvent.click(screen.getByText('Next'))
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('B1,B2')
    )

    switchTo(API_A)
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('A1,A2')
    )
    expect(
      requests.map((url) => [
        url.pathname,
        url.searchParams.get('continuation')
      ])
    ).toEqual([
      ['/a/requests/v3', null],
      ['/a/requests/v3', 'A-next'],
      ['/b/requests/v3', null],
      ['/b/requests/v3', 'B-next']
    ])
  })

  const quoteOptions = {
    user: '0x1111111111111111111111111111111111111111',
    originChainId: 1,
    destinationChainId: 10,
    originCurrency: '0x0000000000000000000000000000000000000000',
    destinationCurrency: '0x0000000000000000000000000000000000000000',
    amount: '1',
    tradeType: 'EXACT_INPUT' as const
  }
  const cases = [
    {
      name: 'useTokenList',
      useData: (base: string) => useTokenList(base, { chainIds: [1] }).data,
      first: '"symbol":"A"',
      second: '"symbol":"B"'
    },
    {
      name: 'useTokenPrice',
      useData: (base: string) =>
        useTokenPrice(base, { chainId: 1, address: '0x0' }).data,
      first: '"price":"1"',
      second: '"price":"2"'
    },
    {
      name: 'useTrendingCurrencies',
      useData: (base: string) => useTrendingCurrencies(base, { limit: 1 }).data,
      first: '"symbol":"A"',
      second: '"symbol":"B"'
    },
    {
      name: 'useDepositAddressStatus',
      useData: (base: string) =>
        useDepositAddressStatus({ depositAddress: 'deposit' }, base).data,
      first: '"requestId":"A1"',
      second: '"requestId":"B1"'
    },
    {
      name: 'useExecutionStatus with client endpoint',
      useData: (base: string) =>
        useExecutionStatus(createClient({ baseApiUrl: base, source: 'test' }), {
          requestId: 'request'
        }).data,
      first: '"status":"pending"',
      second: '"status":"success"'
    },
    {
      name: 'useQuote with client endpoint',
      useData: (base: string) =>
        useQuote(
          createClient({ baseApiUrl: base, source: 'test' }),
          undefined,
          quoteOptions
        ).data,
      first: '"operation":"A"',
      second: '"operation":"B"'
    },
    {
      name: 'useQuote with explicit endpoint overriding the client',
      useData: (base: string) =>
        useQuote(
          createClient({ baseApiUrl: API_A, source: 'test' }),
          undefined,
          quoteOptions,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          base
        ).data,
      first: '"operation":"A"',
      second: '"operation":"B"'
    }
  ]

  it.each(cases)(
    'refreshes $name when its endpoint changes',
    async (testCase) => {
      function Consumer({ base }: { base: string }) {
        return <output>{JSON.stringify(testCase.useData(base))}</output>
      }
      const { switchTo } = mount(Consumer)
      await waitFor(() =>
        expect(screen.getByRole('status').textContent).toContain(testCase.first)
      )

      switchTo(API_B)

      await waitFor(() =>
        expect(screen.getByRole('status').textContent).toContain(
          testCase.second
        )
      )
    }
  )

  it('preserves custom query options and their query key precedence', async () => {
    const customKey = ['custom-history']
    function Consumer({ base }: { base: string }) {
      const query = useRequests({ limit: 1 }, base, {
        queryKey: customKey,
        enabled: false
      })
      return (
        <>
          <output>{query.data.map((request) => request.id).join(',')}</output>
          <button onClick={() => query.refetch()}>Load</button>
        </>
      )
    }
    const { client, switchTo } = mount(Consumer)
    expect(requests).toHaveLength(0)
    fireEvent.click(screen.getByText('Load'))
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('A1')
    )

    switchTo(API_B)

    expect(screen.getByRole('status').textContent).toBe('A1')
    expect(requests).toHaveLength(1)
    expect(client.getQueryState(customKey)?.status).toBe('success')
  })
})
