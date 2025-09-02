import { paths } from '@relayprotocol/relay-sdk'
import type { NextApiRequest, NextApiResponse } from 'next'

type QuoteResponse =
  paths['/quote']['post']['responses']['200']['content']['application/json']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuoteResponse>
) {
  const { query } = req

  const url = new URL('https://api.relay.link/quote')

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value as string)
  }

  // Here you can add any checks you'd like to before fetching the gas subsidized quote
  // You can do things like:
  // - Check if the tokens are eligible for gas sponsorship
  // - Check if the user is likely a bot

  const body: paths['/quote']['post']['requestBody']['content']['application/json'] =
    {
      ...req.body,
      subsidizeFees: true,
      maxSubsidizationAmount: '1000000000000000000'
    }
  body.referrer = 'relay.link'

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
