import type { Execute } from '../../src/types'

/**
 * Real 3-step quote captured from the Relay API for a USDT → ETH same-chain
 * swap on Ethereum mainnet when the sender has an existing non-zero allowance.
 *
 * USDT on Ethereum (0xdac17f958d2ee523a2206206994597c13d831ec7) uses a
 * non-standard `approve` that reverts if `currentAllowance != 0 && newValue != 0`.
 * The backend emits a leading "approve to 0" reset step before the actual
 * approve + swap, producing this 3-step shape.
 */
export const swapWithZeroResetApproval: Execute = {
  steps: [
    {
      id: 'approve',
      action: 'Confirm transaction in your wallet',
      description: 'Sign an approval for USDT',
      kind: 'transaction',
      items: [
        {
          status: 'incomplete',
          data: {
            from: '0x1085F865A839617A878301F1BaC1c2650Aa66299',
            to: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            // approve(0xccc88a9d...c315be, 0) — zero reset
            data: '0x095ea7b3000000000000000000000000ccc88a9d1b4ed6b0eaba998850414b24f1c315be0000000000000000000000000000000000000000000000000000000000000000',
            value: '0',
            chainId: 1,
            gas: '40855',
            maxFeePerGas: '3363515336',
            maxPriorityFeePerGas: '1301553351'
          }
        }
      ],
      requestId:
        '0xea01d14592a31e8e38ed8bc4adfc9b8c77b2510c39d397e99c17559886b3efa3'
    },
    {
      id: 'approve',
      action: 'Confirm transaction in your wallet',
      description: 'Sign an approval for USDT',
      kind: 'transaction',
      items: [
        {
          status: 'incomplete',
          data: {
            from: '0x1085F865A839617A878301F1BaC1c2650Aa66299',
            to: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            // approve(0xccc88a9d...c315be, 0x30d40 = 200000 = 0.2 USDT)
            data: '0x095ea7b3000000000000000000000000ccc88a9d1b4ed6b0eaba998850414b24f1c315be0000000000000000000000000000000000000000000000000000000000030d40',
            value: '0',
            chainId: 1,
            maxFeePerGas: '3363515336',
            maxPriorityFeePerGas: '1301553351'
          }
        }
      ],
      requestId:
        '0xea01d14592a31e8e38ed8bc4adfc9b8c77b2510c39d397e99c17559886b3efa3'
    },
    {
      id: 'swap',
      action: 'Confirm transaction in your wallet',
      description: 'Swapping USDT for ETH',
      kind: 'transaction',
      items: [
        {
          status: 'incomplete',
          data: {
            from: '0x1085F865A839617A878301F1BaC1c2650Aa66299',
            to: '0xccc88a9d1b4ed6b0eaba998850414b24f1c315be',
            // truncated for fixture readability — real calldata in the issue repro
            data: '0xf9e4bab4',
            value: '0',
            chainId: 1,
            gas: '488668',
            maxFeePerGas: '3363515336',
            maxPriorityFeePerGas: '1301553351'
          },
          check: {
            endpoint:
              '/intents/status/v3?requestId=0xea01d14592a31e8e38ed8bc4adfc9b8c77b2510c39d397e99c17559886b3efa3',
            method: 'GET'
          }
        }
      ],
      requestId:
        '0xea01d14592a31e8e38ed8bc4adfc9b8c77b2510c39d397e99c17559886b3efa3'
    }
  ],
  fees: {
    gas: {
      currency: {
        chainId: 1,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
          isNative: true
        }
      },
      amount: '1504285144811296',
      amountFormatted: '0.001504285144811296',
      amountUsd: '3.681904'
    },
    relayer: {
      currency: {
        chainId: 1,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
          isNative: true
        }
      },
      amount: '0',
      amountFormatted: '0.0',
      amountUsd: '0.000000'
    },
    relayerGas: {
      currency: {
        chainId: 1,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
          isNative: true
        }
      },
      amount: '0',
      amountFormatted: '0.0',
      amountUsd: '0.000000'
    },
    relayerService: {
      currency: {
        chainId: 1,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
          isNative: true
        }
      },
      amount: '0',
      amountFormatted: '0.0',
      amountUsd: '0.000000'
    },
    app: {
      currency: {
        chainId: 1,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
          isNative: true
        }
      },
      amount: '0',
      amountFormatted: '0.0',
      amountUsd: '0.000000'
    }
  },
  details: {
    sender: '0x1085F865A839617A878301F1BaC1c2650Aa66299',
    recipient: '0x1085F865A839617A878301F1BaC1c2650Aa66299',
    currencyIn: {
      currency: {
        chainId: 1,
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        metadata: {
          logoURI:
            'https://coin-images.coingecko.com/coins/images/39963/large/usdt.png?1724952731',
          verified: true,
          isNative: false
        }
      },
      amount: '200000',
      amountFormatted: '0.2',
      amountUsd: '0.199945'
    },
    currencyOut: {
      currency: {
        chainId: 1,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        metadata: {
          logoURI: 'https://assets.relay.link/icons/1/light.png',
          verified: true,
          isNative: true
        }
      },
      amount: '81806537769935',
      amountFormatted: '0.000081806537769935',
      amountUsd: '0.200231'
    },
    totalImpact: {
      usd: '0.000286',
      percent: '0.14'
    },
    swapImpact: {
      usd: '0.000286',
      percent: '0.14'
    },
    rate: '0.000409032688849675',
    slippageTolerance: {
      origin: {
        usd: '0.002002',
        value: '818065387535',
        percent: '1.00'
      },
      destination: {
        usd: '0',
        value: '0',
        percent: '0'
      }
    }
  }
}
