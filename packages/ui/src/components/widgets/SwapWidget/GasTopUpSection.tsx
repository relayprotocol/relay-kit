import { type RelayChain } from '@relayprotocol/relay-sdk'
import type { FC } from 'react'
import { Text, Pill, ChainTokenIcon } from '../../primitives/index.js'
import { formatBN, formatDollar } from '../../../utils/numbers.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClose, faPlus } from '@fortawesome/free-solid-svg-icons'
import { ASSETS_RELAY_API } from '@relayprotocol/relay-sdk'

type Props = {
  toChain?: RelayChain
  gasTopUpEnabled: boolean
  onGasTopUpEnabled: (enabled: boolean) => void
  gasTopUpRequired: boolean
  gasTopUpAmount?: bigint
  gasTopUpAmountUsd?: string
  gasTopUpBalance?: bigint
}

const GasTopUpSection: FC<Props> = ({
  toChain,
  gasTopUpEnabled,
  onGasTopUpEnabled,
  gasTopUpRequired,
  gasTopUpAmount,
  gasTopUpAmountUsd,
  gasTopUpBalance
}) => {
  const currency = toChain?.currency
  const gasTokenIsSupported = toChain?.currency?.supportsBridging

  if (!currency || !gasTopUpRequired || !gasTokenIsSupported) {
    return null
  }

  const currencyIcon = `${ASSETS_RELAY_API}/icons/currencies/${
    currency?.id ?? currency?.symbol?.toLowerCase() ?? toChain?.id
  }.png`

  return (
    <Pill
      color="primary"
      css={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
      onClick={() => {
        onGasTopUpEnabled(!gasTopUpEnabled)
      }}
    >
      {gasTopUpEnabled ? (
        <>
          <Text
            style="subtitle2"
            css={{
              color: 'primary12',
              mr: '2'
            }}
          >
            +
            {gasTopUpAmount
              ? formatBN(gasTopUpAmount, 5, currency.decimals ?? 18)
              : '-'}{' '}
            {gasTopUpAmountUsd ? `(${formatDollar(+gasTopUpAmountUsd)})` : '-'}
          </Text>
          <ChainTokenIcon
            chainId={toChain?.id}
            tokenlogoURI={currencyIcon}
            size="sm"
            chainRadius={2}
          />
          <Text style="subtitle2" ellipsify>
            {toChain?.currency?.symbol}
          </Text>
          <FontAwesomeIcon icon={faClose} />
        </>
      ) : (
        <>
          <Text
            style="subtitle2"
            css={{
              color: 'primary12',
              mr: '6px'
            }}
          >
            Low on gas (Balance:{' '}
            {gasTopUpBalance
              ? formatBN(gasTopUpBalance, 5, currency.decimals ?? 18)
              : '0'}{' '}
            {currency.symbol})
          </Text>
          <FontAwesomeIcon icon={faPlus} />
        </>
      )}
    </Pill>
  )
}

export default GasTopUpSection
