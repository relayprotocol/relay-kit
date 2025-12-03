import type {
  Execute,
  SignatureStepItem,
  AdaptedWallet,
  RelayChain
} from '../../types/index.js'
import { axios } from '../index.js'
import type { AxiosRequestConfig } from 'axios'
import { LogLevel } from '../logger.js'
import type { RelayClient } from '../../client.js'
import type { SetStateData } from './index.js'
import { sendUsd } from '../hyperliquid.js'

/**
 * Handles the execution of a signature step item, including signing, posting, and validation.
 */
export async function handleSignatureStepItem({
  stepItem,
  step,
  wallet,
  setState,
  request,
  client,
  json,
  maximumAttempts,
  pollingInterval,
  chain,
  onWebsocketFailed
}: {
  stepItem: SignatureStepItem
  step: Execute['steps'][0]
  wallet: AdaptedWallet
  setState: (data: SetStateData) => any
  request: AxiosRequestConfig
  client: RelayClient
  json: Execute
  maximumAttempts: number
  pollingInterval: number
  chain: RelayChain
  onWebsocketFailed: (() => Promise<void>) | null
}): Promise<void> {
  if (!stepItem.data) {
    throw `Step item is missing data`
  }

  let signature: string | undefined
  const signData = stepItem.data['sign']
  const postData = stepItem.data['post']

  client.log(['Execute Steps: Begin signature step'], LogLevel.Verbose)

  if (signData) {
    stepItem.progressState = 'signing'
    setState({
      steps: [...json.steps],
      fees: { ...json?.fees },
      breakdown: json?.breakdown,
      details: json?.details
    })

    signature = await wallet.handleSignMessageStep(stepItem, step)

    if (signature) {
      request.params = {
        ...request.params,
        signature
      }
    }
  }

  if (chain.id === 1337 && signature && step?.id === ('sign' as any)) {
    await sendUsd(client, signature, stepItem)
  }

  if (postData) {
    client.log(['Execute Steps: Posting order'], LogLevel.Verbose)
    stepItem.progressState = 'posting'
    setState({
      steps: [...json.steps],
      fees: { ...json?.fees },
      breakdown: json?.breakdown,
      details: json?.details
    })
    const postOrderUrl = new URL(`${request.baseURL}${postData.endpoint}`)
    const headers = {
      'Content-Type': 'application/json'
    }

    if (postData.body && !postData.body.referrer) {
      postData.body.referrer = client.source
    }

    try {
      const res = await axios.request({
        url: postOrderUrl.href,
        data: postData.body ? JSON.stringify(postData.body) : undefined,
        method: postData.method,
        params: request.params,
        headers
      })

      // Append new steps if returned in response
      if (res.data && res.data.steps && Array.isArray(res.data.steps)) {
        json.steps = [...json.steps, ...res.data.steps]
        setState({
          steps: [...json.steps, ...res.data.steps],
          fees: { ...json.fees },
          breakdown: json.breakdown,
          details: json.details
        })
        client.log(
          [
            `Execute Steps: New steps appended from ${postData.endpoint}`,
            res.data.steps
          ],
          LogLevel.Verbose
        )
        return
      }

      if (res.status > 299 || res.status < 200) throw res.data

      if (res.data.results) {
        stepItem.orderData = res.data.results
      } else if (res.data && res.data.orderId) {
        stepItem.orderData = [
          {
            orderId: res.data.orderId,
            crossPostingOrderId: res.data.crossPostingOrderId,
            orderIndex: res.data.orderIndex || 0
          }
        ]
      }
      setState({
        steps: [...json?.steps],
        fees: { ...json?.fees },
        breakdown: json?.breakdown,
        details: json?.details
      })
    } catch (err) {
      throw err
    }
  }

  // If check, poll check until validated
  if (stepItem?.check) {
    stepItem.progressState = 'validating'
    stepItem.isValidatingSignature = true
    setState({
      steps: [...json.steps],
      fees: { ...json?.fees },
      breakdown: json?.breakdown,
      details: json?.details
    })

    const headers = {
      'Content-Type': 'application/json'
    }

    // If websocket is enabled, wait for it to fail before falling back to polling
    if (onWebsocketFailed) {
      client.log(
        [
          'Waiting for WebSocket to fail before starting signature validation polling'
        ],
        LogLevel.Verbose
      )
      try {
        await onWebsocketFailed()
        client.log(
          ['WebSocket failed, starting signature polling'],
          LogLevel.Verbose
        )
      } catch (e) {
        client.log(
          ['WebSocket failed promise rejected, skipping signature polling'],
          LogLevel.Verbose
        )
        return
      }
    }

    // Start polling for signature validation
    const pollWithCancellation = async () => {
      // Helper to update state
      const updateState = () => {
        setState({
          steps: [...json?.steps],
          fees: { ...json?.fees },
          breakdown: json?.breakdown,
          details: json?.details
        })
      }

      // Helper to extract and set origin txHashes
      const extractOriginTxHashes = (
        inTxHashesData: string[],
        originChainId?: number
      ) => {
        const chainInTxHashes: NonNullable<
          Execute['steps'][0]['items']
        >[0]['txHashes'] = inTxHashesData.map((hash: string) => ({
          txHash: hash,
          chainId: originChainId ?? chain?.id
        }))
        stepItem.internalTxHashes = chainInTxHashes
      }

      // Helper to extract and set destination txHashes
      const extractDestinationTxHashes = (
        txHashesData: string[],
        destinationChainId?: number
      ) => {
        const chainTxHashes: NonNullable<
          Execute['steps'][0]['items']
        >[0]['txHashes'] = txHashesData.map((hash: string) => ({
          txHash: hash,
          chainId: destinationChainId ?? chain?.id
        }))
        stepItem.txHashes = chainTxHashes
      }

      let attemptCount = 0
      while (attemptCount < maximumAttempts) {
        try {
          let endpoint = stepItem?.check?.endpoint || ''

          // Override v2 status endpoint to v3 to get 'submitted' status
          if (
            endpoint.includes('/intents/status') &&
            !endpoint.includes('/v3')
          ) {
            endpoint = endpoint.replace('/intents/status', '/intents/status/v3')
          }

          const res = await axios.request({
            url: `${request.baseURL}${endpoint}`,
            method: stepItem?.check?.method,
            headers,
            validateStatus: (status) => status < 500 // Don't throw on 4xx responses
          })

          // Check status
          if (res?.data?.status === 'pending') {
            // Extract origin txHashes if provided
            if (res?.data?.inTxHashes && res.data.inTxHashes.length > 0) {
              extractOriginTxHashes(res.data.inTxHashes, res.data.originChainId)
            }

            stepItem.checkStatus = 'pending'
            stepItem.progressState = undefined
            stepItem.isValidatingSignature = false
            updateState()
            client.log(
              ['Origin tx confirmed, backend processing'],
              LogLevel.Verbose
            )
          } else if (res?.data?.status === 'submitted') {
            // Extract destination txHashes if provided
            if (res?.data?.txHashes && res.data.txHashes.length > 0) {
              extractDestinationTxHashes(
                res.data.txHashes,
                res.data.destinationChainId
              )
            }

            // Extract origin txHashes if provided
            if (res?.data?.inTxHashes && res.data.inTxHashes.length > 0) {
              extractOriginTxHashes(res.data.inTxHashes, res.data.originChainId)
            }

            stepItem.checkStatus = 'submitted'
            stepItem.progressState = undefined
            stepItem.isValidatingSignature = false
            updateState()
            client.log(
              ['Destination tx submitted, continuing validation'],
              LogLevel.Verbose
            )
          } else if (res?.data?.status === 'success' && res?.data?.txHashes) {
            // Extract destination txHashes
            extractDestinationTxHashes(
              res.data.txHashes,
              res.data.destinationChainId
            )

            // Extract origin txHashes if provided (keeping original chainId order)
            if (res?.data?.inTxHashes) {
              const chainInTxHashes: NonNullable<
                Execute['steps'][0]['items']
              >[0]['txHashes'] = res.data.inTxHashes.map((hash: string) => ({
                txHash: hash,
                chainId: chain?.id ?? res.data.originChainId
              }))
              stepItem.internalTxHashes = chainInTxHashes
            }

            stepItem.checkStatus = 'success'
            stepItem.status = 'complete'
            stepItem.progressState = 'complete'
            updateState()
            client.log(['Transaction completed successfully'], LogLevel.Verbose)
            return // Success - exit polling
          } else if (res?.data?.status === 'failure') {
            throw Error(res?.data?.details || 'Transaction failed')
          } else if (res.status >= 400) {
            // Handle HTTP error responses that don't have our expected data structure
            throw Error(
              res?.data?.details || res?.data?.message || 'Failed to check'
            )
          }

          attemptCount++
          await new Promise((resolve) => setTimeout(resolve, pollingInterval))
        } catch (error: any) {
          // If it's a deliberate failure response, re-throw immediately
          if (
            error.message &&
            (error.message.includes('Transaction failed') ||
              error.message.includes('Failed to check') ||
              error.message === 'Failed to check')
          ) {
            throw error
          }

          // For network errors or other recoverable issues, continue polling
          client.log(
            ['Check request failed, retrying...', error],
            LogLevel.Verbose
          )
          attemptCount++
          await new Promise((resolve) => setTimeout(resolve, pollingInterval))
        }
      }

      // Max attempts reached
      throw new Error(
        `Failed to get an ok response after ${attemptCount} attempt(s), aborting`
      )
    }

    await pollWithCancellation()
  }
}
