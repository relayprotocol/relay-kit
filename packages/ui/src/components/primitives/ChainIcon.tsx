import { useContext, type FC } from 'react'
import { Flex } from './index.js'
import useRelayClient from '../../hooks/useRelayClient.js'
import type { Styles } from '@relayprotocol/relay-design-system/css'
import { ProviderOptionsContext } from '../../providers/RelayKitProvider.js'

type Props = {
  chainId?: number
  height?: number
  width?: number
  css?: Styles
  square?: boolean
  borderRadius?: number
}

const ChainIcon: FC<Props> = ({
  chainId,
  css = {},
  height = 14,
  width = 14,
  square = true,
  borderRadius
}) => {
  const providerOptions = useContext(ProviderOptionsContext)
  const client = useRelayClient()
  const chain = chainId
    ? client?.chains?.find((chain) => chain.id === chainId)
    : null

  const icon = chain
    ? providerOptions.themeScheme === 'dark'
      ? chain.icon?.dark || chain.icon?.light
      : chain.icon?.light
    : null

  const iconUrl =
    square && icon ? icon.replace('/icons/', '/icons/square/') : icon

  return iconUrl ? (
    <Flex
      css={{
        display: 'flex',
        flexShrink: 0,
        ...css
      }}
      style={{
        height: height,
        width: width
      }}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={`Chain #${chainId}`}
          style={{
            borderRadius: borderRadius ?? (square ? 4 : 0),
            width: css && css.width ? Number(css.width) : '100%',
            height: css && css.height ? Number(css.height) : '100%'
          }}
        />
      ) : null}
    </Flex>
  ) : null
}

export default ChainIcon
