import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http, type Config } from 'wagmi'
import { mainnet, sepolia } from 'viem/chains'
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
  axios,
  convertViemChainToRelayChain,
  createClient,
  type RelayChain
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
const pendingRpc: (() => void)[] = []

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
      await new Promise<void>((resolve) => pendingRpc.push(resolve))
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: method === 'eth_call' ? answerEthCall(params[0]) : '0x'
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }
)

const solanaChain = {
  ...toChain,
  id: 792703809,
  name: 'solana',
  displayName: 'Solana',
  vmType: 'svm' as const
}

const mainnetWagmiConfig = () =>
  createConfig({
    chains: [mainnet],
    transports: { [mainnet.id]: http(RPC_URL) }
  })

const sepoliaOnlyWagmiConfig = () =>
  createConfig({
    chains: [sepolia],
    transports: { [sepolia.id]: http('https://sepolia-rpc.test/') }
  })

const renderModal = ({
  destination = toChain,
  wagmiConfig = mainnetWagmiConfig()
}: { destination?: RelayChain; wagmiConfig?: Config } = {}) => {
  const onConfirmed = vi.fn()
  const relayClient = createClient({ chains: [toChain, solanaChain] })
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
            toChain={destination}
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
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'vitalik.eth' }
  })

const saveButton = () => screen.getByTestId('save-button')

const resolveOnChain = async () => {
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(RPC_URL, expect.anything())
  )
  expect(saveButton()).toHaveProperty('disabled', true)
  pendingRpc.splice(0).forEach((release) => release())
}

beforeEach(() => {
  localStorage.clear()
  pendingRpc.length = 0
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

  it('keeps Save disabled while a cached ENS name refetches and commits the refreshed address', async () => {
    registryAddress = THIRD_PARTY_ADDRESS
    const { onConfirmed } = renderModal()

    typeEnsName()
    await resolveOnChain()
    await screen.findByText(THIRD_PARTY_ADDRESS)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
    registryAddress = REGISTRY_ADDRESS
    fetchMock.mockClear()

    typeEnsName()
    await resolveOnChain()

    await screen.findByText(REGISTRY_ADDRESS)
    await waitFor(() => expect(saveButton()).toHaveProperty('disabled', false))
    fireEvent.click(saveButton())

    expect(onConfirmed).toHaveBeenCalledWith(REGISTRY_ADDRESS)
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

  it("resolves through the relay client's mainnet RPC when wagmi has no mainnet", async () => {
    registryAddress = REGISTRY_ADDRESS
    const { onConfirmed } = renderModal({
      wagmiConfig: sepoliaOnlyWagmiConfig()
    })

    typeEnsName()
    await resolveOnChain()

    await screen.findByText(REGISTRY_ADDRESS)
    await waitFor(() => expect(saveButton()).toHaveProperty('disabled', false))
    fireEvent.click(saveButton())

    expect(onConfirmed).toHaveBeenCalledWith(REGISTRY_ADDRESS)
  })

  it('does not present an ENS address for a destination that cannot receive it', async () => {
    registryAddress = REGISTRY_ADDRESS
    const { onConfirmed } = renderModal({ destination: solanaChain })

    typeEnsName()
    await resolveOnChain()

    await screen.findByText('Not a valid address')
    expect(screen.queryByText(/Resolved address/)).toBeNull()
    expect(saveButton()).toHaveProperty('disabled', true)

    fireEvent.click(saveButton())

    expect(onConfirmed).not.toHaveBeenCalled()
  })
})

const ECLIPSE_USDC_TOKEN_ACCOUNT =
  '9hkQNZKRsShUnDgNEYSLAbd7v89QHzjzJxaZyg75VECf'
const ECLIPSE_USDC_TOKEN_ACCOUNT_OWNER =
  'CBG9TQpCKSbt7ozAVUyHf7BGwFyFgvmAzqrjJH83ZGX1'
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'

describe('CustomAddressModal SVM recipient check', () => {
  const svmRpcUrl = 'https://eclipse-rpc.test/'
  let svmRpcDown = false

  beforeEach(() => {
    svmRpcDown = false
    vi.spyOn(axios, 'post').mockImplementation(async (url, body: any) => {
      if (url !== svmRpcUrl) {
        throw new Error(`Unexpected request: ${url}`)
      }
      if (svmRpcDown) {
        throw new Error('Service Unavailable')
      }
      const value =
        body.params[0] === ECLIPSE_USDC_TOKEN_ACCOUNT
          ? {
              data: ['', 'base64'],
              executable: false,
              lamports: 20264,
              owner: TOKEN_2022_PROGRAM_ID,
              rentEpoch: 18446744073709551615,
              space: 170
            }
          : null
      return {
        data: {
          jsonrpc: '2.0',
          id: body.id,
          result: { context: { slot: 202917423 }, value }
        }
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const eclipseChain = (httpRpcUrl?: string) => ({
    ...solanaChain,
    id: 9286185,
    name: 'eclipse',
    displayName: 'Eclipse',
    httpRpcUrl
  })

  const typeAddress = (value: string) =>
    fireEvent.change(screen.getByRole('textbox'), { target: { value } })

  it('blocks an Eclipse token account', async () => {
    const { onConfirmed } = renderModal({
      destination: eclipseChain(svmRpcUrl)
    })

    typeAddress(ECLIPSE_USDC_TOKEN_ACCOUNT)

    await screen.findByText(/This address is a token account/)
    expect(saveButton()).toHaveProperty('disabled', true)
    fireEvent.click(saveButton())
    expect(onConfirmed).not.toHaveBeenCalled()
  })

  it('accepts the Eclipse wallet that owns the token account', async () => {
    const { onConfirmed } = renderModal({
      destination: eclipseChain(svmRpcUrl)
    })

    typeAddress(ECLIPSE_USDC_TOKEN_ACCOUNT_OWNER)

    await waitFor(() => expect(saveButton()).toHaveProperty('disabled', false))
    fireEvent.click(saveButton())
    expect(onConfirmed).toHaveBeenCalledWith(ECLIPSE_USDC_TOKEN_ACCOUNT_OWNER)
  })

  const unverifiedWarning = /couldn't verify this address is a wallet/
  const confirmCheckbox = () =>
    screen.getByRole('checkbox', { name: 'I confirm this is a wallet address' })

  it('requires confirmation for an address it cannot verify, per address', async () => {
    svmRpcDown = true
    const { onConfirmed } = renderModal({
      destination: eclipseChain(svmRpcUrl)
    })

    typeAddress(ECLIPSE_USDC_TOKEN_ACCOUNT)

    await screen.findByText(unverifiedWarning)
    expect(saveButton()).toHaveProperty('disabled', true)
    fireEvent.click(saveButton())
    expect(onConfirmed).not.toHaveBeenCalled()

    fireEvent.click(confirmCheckbox())
    expect(saveButton()).toHaveProperty('disabled', false)

    typeAddress(ECLIPSE_USDC_TOKEN_ACCOUNT_OWNER)

    await waitFor(() =>
      expect(confirmCheckbox()).toHaveProperty('checked', false)
    )
    expect(saveButton()).toHaveProperty('disabled', true)

    fireEvent.click(confirmCheckbox())
    fireEvent.click(saveButton())
    expect(onConfirmed).toHaveBeenCalledWith(ECLIPSE_USDC_TOKEN_ACCOUNT_OWNER)
  })

  it('does not look up a partially typed address', async () => {
    svmRpcDown = true
    renderModal({ destination: eclipseChain(svmRpcUrl) })

    typeAddress(ECLIPSE_USDC_TOKEN_ACCOUNT_OWNER.slice(0, 33))

    await screen.findByTestId('save-button')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(axios.post).not.toHaveBeenCalled()
    expect(screen.queryByText(unverifiedWarning)).toBeNull()
  })

  it('drops the warning once the RPC recovers', async () => {
    svmRpcDown = true
    const { onConfirmed } = renderModal({
      destination: eclipseChain(svmRpcUrl)
    })

    typeAddress(ECLIPSE_USDC_TOKEN_ACCOUNT_OWNER)
    await screen.findByText(unverifiedWarning)

    svmRpcDown = false
    typeAddress('')
    typeAddress(ECLIPSE_USDC_TOKEN_ACCOUNT_OWNER)

    await waitFor(() => expect(saveButton()).toHaveProperty('disabled', false))
    expect(screen.queryByText(unverifiedWarning)).toBeNull()
    fireEvent.click(saveButton())
    expect(onConfirmed).toHaveBeenCalledWith(ECLIPSE_USDC_TOKEN_ACCOUNT_OWNER)
  })

  it('requires confirmation on an SVM chain without an RPC to check it', async () => {
    const { onConfirmed } = renderModal({ destination: eclipseChain() })

    typeAddress(ECLIPSE_USDC_TOKEN_ACCOUNT_OWNER)

    await screen.findByText(unverifiedWarning)
    expect(saveButton()).toHaveProperty('disabled', true)

    fireEvent.click(confirmCheckbox())
    fireEvent.click(saveButton())
    expect(onConfirmed).toHaveBeenCalledWith(ECLIPSE_USDC_TOKEN_ACCOUNT_OWNER)
  })
})
