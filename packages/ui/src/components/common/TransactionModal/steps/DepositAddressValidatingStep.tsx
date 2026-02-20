import type { FC } from 'react'
import { Anchor, Button, Flex, Text } from '../../../primitives/index.js'
import { LoadingSpinner } from '../../LoadingSpinner.js'
import { useExecutionStatus } from '@relayprotocol/relay-kit-hooks'
import { useRelayClient } from '../../../../hooks/index.js'

type DepositAddressValidatingStepProps = {
  txHashes: string[]
  status: NonNullable<ReturnType<typeof useExecutionStatus>['data']>['status']
}

export const DepositAddressValidatingStep: FC<
  DepositAddressValidatingStepProps
> = ({ txHashes, status }) => {
  const relayClient = useRelayClient()
  const transactionBaseUrl =
    relayClient?.baseApiUrl && relayClient.baseApiUrl.includes('testnet')
      ? 'https://testnets.relay.link'
      : 'https://relay.link'
  const txHash = txHashes && txHashes[0] ? txHashes[0] : undefined

  return (
    <>
      <Flex direction="column" align="center" justify="between">
        <LoadingSpinner
          className="relay-h-10 relay-w-10 relay-fill-[var(--relay-colors-primary-color)]"
        />
        <Text style="subtitle2" className="relay-mt-4 relay-mb-2 relay-text-center">
          Funds received. Your transaction is now in progress.
        </Text>
        <Text
          color="subtle"
          style="body2"
          className="relay-mt-3 relay-text-center"
        >
          Feel free to leave at any time, you can track your progress within the{' '}
          <Anchor
            href={`${transactionBaseUrl}/transaction/${txHash}`}
            target="_blank"
            rel="noreffer"
          >
            {' '}
            transaction page
          </Anchor>
          .
        </Text>
      </Flex>
      <Button
        disabled={true}
        className="relay-text-[color:var(--relay-colors-button-disabled-color)_!important] relay-mt-2 relay-justify-center"
      >
        <LoadingSpinner
          className="relay-h-4 relay-w-4 relay-fill-[var(--relay-colors-button-disabled-color)]"
        />
        Validating Transaction
      </Button>
    </>
  )
}
