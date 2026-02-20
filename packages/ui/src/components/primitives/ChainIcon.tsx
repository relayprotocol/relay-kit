import { useContext, type FC } from 'react'
import useRelayClient from '../../hooks/useRelayClient.js'
import { ProviderOptionsContext } from '../../providers/RelayKitProvider.js'
import { cn } from '../../utils/cn.js'

type Props = {
  chainId?: number
  height?: number
  width?: number
  className?: string
  square?: boolean
  borderRadius?: number
}

const ChainIcon: FC<Props> = ({
  chainId,
  className,
  height = 14,
  width = 14,
  square = true,
  borderRadius = 4
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
    <div
      className={cn('relay-flex relay-shrink-0', className)}
      style={{
        height: height,
        width: width,
        borderRadius: borderRadius
      }}
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={`Chain #${chainId}`}
          style={{
            borderRadius: square ? borderRadius : 0,
            width: '100%',
            height: '100%'
          }}
        />
      ) : null}
    </div>
  ) : null
}

export default ChainIcon
