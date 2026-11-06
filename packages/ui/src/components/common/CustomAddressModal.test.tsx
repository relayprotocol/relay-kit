import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet } from 'viem/chains'
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionResult,
  multicall3Abi,
  parseAbiParameters,
  stringToHex,
  type Hex
} from 'viem'
import {
  convertViemChainToRelayChain,
  createClient
} from '@relayprotocol/relay-sdk'
import { RelayClientContext } from '../../providers/RelayClientProvider.js'
import { getCustomAddresses } from '../../utils/localStorage.js'
import { CustomAddressModal } from './CustomAddressModal.js'

vi.mock('@relayprotocol/relay-kit-hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@relayprotocol/relay-kit-hooks')>()),
  useTokenList: () => ({ data: [], isLoading: false })
}))

const RPC_URL = 'https://mainnet-rpc.test/'
const REGISTRY_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const THIRD_PARTY_ADDRESS = '0x1111111111111111111111111111111111111111'
const RESOLVER_ADDRESS = '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63'
const DNS_ENCODED_NAME = stringToHex('\x07vitalik\x03eth\x00').slice(2)

const toChain = {
  ...convertViemChainToRelayChain(mainnet),
  httpRpcUrl: RPC_URL
}

let registryAddress: string
let releaseRpc: () => void

const encodeResolveResult = (address: string) =>
  encodeAbiParameters(parseAbiParameters('bytes, address'), [
    encodeAbiParameters(parseAbiParameters('address'), [
      address as `0x${string}`
    ]),
    RESOLVER_ADDRESS
  ])

const resolveCall = (to: string, data: string) =>
  to.toLowerCase() ===
    mainnet.contracts.ensUniversalResolver.address.toLowerCase() &&
  data.includes(DNS_ENCODED_NAME)
    ? encodeResolveResult(registryAddress)
    : undefined

const answerEthCall = ({ to, data }: { to: string; data: Hex }) => {
  if (to.toLowerCase() !== mainnet.contracts.multicall3.address.toLowerCase()) {
    return resolveCall(to, data) ?? '0x'
  }
  const { args } = decodeFunctionData({ abi: multicall3Abi, data })
  const calls = args[0] as readonly { target: string; callData: Hex }[]
  return encodeFunctionResult({
    abi: multicall3Abi,
    functionName: 'aggregate3',
    result: calls.map(({ target, callData }) => {
      const returnData = resolveCall(target, callData)
      return { success: Boolean(returnData), returnData: returnData ?? '0x' }
    })
  })
}

const fetchMock = vi.fn(
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString()
    if (url.startsWith('https://api.ensideas.com')) {
      return Response.json({ address: THIRD_PARTY_ADDRESS })
    }
    if (url === RPC_URL) {
      const { id, method, params } = JSON.parse(init!.body as string)
      await new Promise<void>((resolve) => (releaseRpc = resolve))
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: method === 'eth_call' ? answerEthCall(params[0]) : '0x'
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }
)

const renderModal = () => {
  const onConfirmed = vi.fn()
  const relayClient = createClient({ chains: [toChain] })
  const wagmiConfig = createConfig({
    chains: [mainnet],
    transports: { [mainnet.id]: http(RPC_URL) }
  })
  render(
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <RelayClientContext.Provider value={relayClient}>
          <CustomAddressModal
            open={true}
            toChain={toChain}
            linkedWallets={[]}
            isConnected={false}
            onOpenChange={() => {}}
            onConfirmed={onConfirmed}
            onClear={() => {}}
          />
        </RelayClientContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  )
  return { onConfirmed }
}

const typeEnsName = () =>
  fireEvent.change(screen.getByPlaceholderText('Address or ENS'), {
    target: { value: 'vitalik.eth' }
  })

const saveButton = () => screen.getByTestId('save-button')

const resolveOnChain = async () => {
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(RPC_URL, expect.anything())
  )
  expect(saveButton()).toHaveProperty('disabled', true)
  releaseRpc()
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {}
    }))
  )
})

afterEach(() => {
  cleanup()
  fetchMock.mockClear()
  vi.unstubAllGlobals()
})

describe('CustomAddressModal ENS resolution', () => {
  it('shows and commits the address from the on-chain registry, not a third-party reply', async () => {
    registryAddress = REGISTRY_ADDRESS
    const { onConfirmed } = renderModal()

    typeEnsName()
    await resolveOnChain()

    await screen.findByText(REGISTRY_ADDRESS)
    expect(screen.getByText('Resolved address')).toBeTruthy()
    expect(document.body.textContent).not.toContain(THIRD_PARTY_ADDRESS)
    await waitFor(() => expect(saveButton()).toHaveProperty('disabled', false))

    fireEvent.click(saveButton())

    expect(onConfirmed).toHaveBeenCalledWith(REGISTRY_ADDRESS)
    expect(getCustomAddresses()).toEqual([REGISTRY_ADDRESS])
  })

  it('does not commit a dead address returned by the registry', async () => {
    registryAddress = '0x000000000000000000000000000000000000dEaD'
    const { onConfirmed } = renderModal()

    typeEnsName()
    await resolveOnChain()

    await screen.findByText('Not a valid address')
    expect(screen.queryByText(/Resolved address/)).toBeNull()
    expect(saveButton()).toHaveProperty('disabled', true)

    fireEvent.click(saveButton())

    expect(onConfirmed).not.toHaveBeenCalled()
    expect(getCustomAddresses()).toEqual([])
  })
})
