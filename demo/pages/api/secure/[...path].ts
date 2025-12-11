import { paths } from '@relayprotocol/relay-sdk'
import type { NextApiRequest, NextApiResponse } from 'next'

type QuoteResponse =
  paths['/quote/v2']['post']['responses']['200']['content']['application/json']

const sponsoredTokens = [
  '792703809:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  '130:0x078d782b760474a361dda0af3839290b0ef57ad6',
  '103665049:0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  '8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  '43114:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
  '137:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  '42161:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  '10:0x0b2c639c533813f4aa9d7837caf62653d097ff85'
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuoteResponse>
) {
  const { query } = req

  const url = new URL('https://api.relay.link/quote/v2')

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value as string)
  }

  // Here you can add any checks you'd like to before fetching the gas subsidized quote
  // You can do things like:
  // - Check if the tokens are eligible for gas sponsorship
  // - Check if the user is likely a bot

  let body = {
    ...req.body,
    referrer: 'relay.link'
  }

  const evmChains = [137, 42161, 43114, 8453, 10]

  const normalizedFromToken =
    req.body.originChainId && evmChains.includes(req.body.originChainId)
      ? `${req.body.originChainId}:${req.body.originCurrency.toLowerCase()}`
      : `${req.body.originChainId}:${req.body.originCurrency}`
  const normalizedToToken =
    req.body.destinationChainId &&
    evmChains.includes(req.body.destinationChainId)
      ? `${req.body.destinationChainId}:${req.body.destinationCurrency.toLowerCase()}`
      : `${req.body.destinationChainId}:${req.body.destinationCurrency}`

  if (
    sponsoredTokens.includes(normalizedFromToken) &&
    sponsoredTokens.includes(normalizedToToken)
  ) {
    body.subsidizeFees = true
    body.maxSubsidizationAmount = '1000000000000000000'
  }

  const response = await fetch(url.href, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.NEXT_RELAY_API_KEY as string
    },
    body: JSON.stringify(body)
  })

  const responseData = await response.json()

  res.status(response.status).json(responseData as QuoteResponse)
}
