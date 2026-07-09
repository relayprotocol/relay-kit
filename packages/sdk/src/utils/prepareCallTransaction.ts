import type { paths } from '../types/index.js'
import { encodeFunctionData } from 'viem'
import type { SimulateContractParameters } from 'viem'

type QuoteCallBody = Omit<
  NonNullable<
    paths['/quote/v2']['post']['requestBody']['content']['application/json']['txs']
  >[0],
  'originalTxValue'
>

export default function prepareCallTransaction(
  request: Pick<
    SimulateContractParameters,
    'abi' | 'functionName' | 'args' | 'address' | 'value'
  >
): Required<QuoteCallBody> {
  const { abi, functionName, args } = request

  const data = encodeFunctionData({ abi, functionName, args })
  return {
    to: request.address,
    value: request?.value?.toString() ?? '0',
    data: data
  }
}
