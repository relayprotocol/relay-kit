import type { Execute } from '../../src/types'

/**
 * Same-chain swap routed as an intent: matching chain ids, but a `deposit` step
 * the solver has to fill. Produced by deposit-address routes, forced solver
 * execution, and chains with no on-chain aggregator (Tron).
 */
export const sameChainDeposit: Execute = {
  steps: [
    {
      id: 'deposit',
      action: 'Confirm transaction in your wallet',
      description: 'Depositing funds to the relayer to execute the swap',
      kind: 'transaction',
      requestId: '0xabc',
      items: [
        {
          status: 'incomplete',
          data: {
            to: '0x00000000bb6dd3b0032d930f72cac8e56166d93c',
            data: '0x01020304',
            value: '1000000000000000',
            chainId: 1
          },
          check: {
            endpoint: '/intents/status?requestId=0xabc',
            method: 'GET'
          }
        }
      ]
    }
  ],
  fees: {},
  details: {
    operation: 'swap',
    sender: '0x03508bB71268BBA25ECaCC8F620e01866650532c',
    recipient: '0x03508bB71268BBA25ECaCC8F620e01866650532c',
    currencyIn: {
      currency: {
        chainId: 1,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18
      },
      amount: '1000000000000000',
      amountFormatted: '0.001',
      amountUsd: '3.417570'
    },
    currencyOut: {
      currency: {
        chainId: 1,
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        name: 'USDCoin',
        decimals: 6
      },
      amount: '3410000',
      amountFormatted: '3.41',
      amountUsd: '3.410000'
    }
  }
}
