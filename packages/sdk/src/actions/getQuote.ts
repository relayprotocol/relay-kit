import { type AxiosRequestConfig } from 'axios'
import { axios } from '../utils/axios.js'
import { zeroAddress, type WalletClient } from 'viem'
import prepareCallTransaction from '../utils/prepareCallTransaction.js'
import {
  isSimulateContractRequest,
  APIError,
  adaptViemWallet,
  type SimulateContractRequest
} from '../utils/index.js'
import { isViemWalletClient } from '../utils/viemWallet.js'
import { getClient, RelayClient } from '../client.js'
import type { AdaptedWallet, Execute, paths } from '../types/index.js'
import { getDeadAddress } from '../constants/address.js'

export type QuoteBody = NonNullable<
  paths['/quote']['post']['requestBody']['content']['application/json']
>
export type QuoteBodyOptions = Omit<
  QuoteBody,
  | 'destinationChainId'
  | 'originChainId'
  | 'originCurrency'
  | 'destinationCurrency'
  | 'amount'
  | 'recipient'
>

export type GetQuoteParameters = {
  chainId: number
  currency: string
  toChainId: number
  toCurrency: string
  tradeType: QuoteBodyOptions['tradeType']
  user?: string
  wallet?: AdaptedWallet | WalletClient
  amount?: string
  recipient?: string
  options?: Omit<Partial<QuoteBodyOptions>, 'source' | 'txs' | 'tradeType'>
  txs?: (NonNullable<QuoteBody['txs']>[0] | SimulateContractRequest)[]
}

const getDefaultQuoteParameters = async (
  client: RelayClient,
  toChainId: number,
  chainId: number,
  recipient?: string,
  adaptedWallet?: AdaptedWallet
): Promise<Partial<GetQuoteParameters>> => {
  const fromChain = client.chains.find((chain) => chain.id === chainId)
  const toChain = client.chains.find((chain) => chain.id === toChainId)
  const originDeadAddress = fromChain
    ? getDeadAddress(fromChain.vmType, fromChain.id)
    : undefined
  const destinationDeadAddress = toChain
    ? getDeadAddress(toChain.vmType, toChain.id)
    : undefined

  let caller: string | undefined

  if (adaptedWallet) {
    caller = await adaptedWallet.address()
  }

  return {
    user: caller || originDeadAddress || zeroAddress,
    recipient: recipient
      ? (recipient as string)
      : caller || destinationDeadAddress || zeroAddress
  }
}

/**
 * Method to get a quote
 * @param data - {@link GetQuoteParameters}
 */
export async function getQuote(
  parameters: GetQuoteParameters,
  includeDefaultParameters?: boolean
): Promise<Execute> {
  const {
    toChainId,
    toCurrency,
    wallet,
    chainId,
    currency,
    tradeType,
    amount = '0',
    recipient,
    options,
    txs,
    user
  } = parameters

  const client = getClient()

  if (!client.baseApiUrl || !client.baseApiUrl.length) {
    throw new ReferenceError('RelayClient missing api url configuration')
  }

  let adaptedWallet: AdaptedWallet | undefined
  if (wallet) {
    adaptedWallet = isViemWalletClient(wallet)
      ? adaptViemWallet(wallet as WalletClient)
      : wallet
  }

  let preparedTransactions: QuoteBody['txs']
  if (txs && txs.length > 0) {
    preparedTransactions = txs.map((tx) => {
      if (isSimulateContractRequest(tx)) {
        return prepareCallTransaction(
          tx as Parameters<typeof prepareCallTransaction>['0']
        )
      }
      return tx
    })
  }

  let defaultParameters: Partial<GetQuoteParameters> | undefined = undefined

  if (includeDefaultParameters) {
    defaultParameters = await getDefaultQuoteParameters(
      client,
      toChainId,
      chainId,
      recipient,
      adaptedWallet
    )
  }

  if (!user && !defaultParameters?.user) {
    throw new Error('User is required')
  }

  if (!recipient && !defaultParameters?.recipient) {
    throw new Error('Recipient is required')
  }


  const query: QuoteBody = {
    user: includeDefaultParameters
      ? (defaultParameters?.user as string)
      : (user as string),
    destinationCurrency: toCurrency,
    destinationChainId: toChainId,
    originCurrency: currency,
    originChainId: chainId,
    amount,
    recipient: includeDefaultParameters
      ? (defaultParameters?.recipient as string)
      : (recipient as string),
    tradeType,
    referrer: client.source || undefined,
    txs: preparedTransactions,
    ...options
  }

  const request: AxiosRequestConfig = {
    url: `${client.baseApiUrl}/quote`,
    method: 'post',
    data: query
  }

  const res = await axios.request(request)
  if (res.status !== 200) {
    throw new APIError(res?.data?.message, res.status, res.data)
  }
  return { ...res.data, request } as Execute
}
