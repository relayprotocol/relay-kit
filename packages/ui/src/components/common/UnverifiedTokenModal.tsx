import type { FC } from 'react'
import { Modal } from './Modal.js'
import type { Token } from '../../types/index.js'
import { Anchor, Box, Button, Flex, Text } from '../primitives/index.js'
import { CopyToClipBoard } from './CopyToClipBoard.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faExclamationTriangle,
  faExternalLink
} from '@fortawesome/free-solid-svg-icons'
import useRelayClient from '../../hooks/useRelayClient.js'
import {
  alreadyAcceptedToken,
  getRelayUiKitData,
  setRelayUiKitData
} from '../../utils/localStorage.js'
import { EventNames } from '../../constants/events.js'
import { cn } from '../../utils/cn.js'

type UnverifiedTokenModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: { token: Token; context?: string }
  onAcceptToken: (token?: Token, context?: string) => void
  onDecline?: (token?: Token, context?: string) => void
  onAnalyticEvent?: (eventName: string, data?: any) => void
}

export const UnverifiedTokenModal: FC<UnverifiedTokenModalProps> = ({
  open,
  onOpenChange,
  data,
  onAcceptToken,
  onDecline,
  onAnalyticEvent
}) => {
  const client = useRelayClient()
  const chain = client?.chains?.find(
    (chain) => chain.id === data?.token?.chainId
  )
  const isValidTokenLogo =
    data?.token?.logoURI && data?.token?.logoURI !== 'missing.png'

  return (
    <Modal
      trigger={null}
      open={open}
      onOpenChange={onOpenChange}
      onPointerDownOutside={() => {
        onDecline?.(data?.token, data?.context)
      }}
      onCloseButtonClicked={() => {
        onDecline?.(data?.token, data?.context)
      }}
      className="relay-overflow-hidden relay-z-[10000001]"
      overlayZIndex={10000001}
    >
      <Flex
        direction="column"
        className="relay-w-full relay-h-full relay-gap-4 sm:relay-w-[370px]"
      >
        <Text style="h6">Unverified Token</Text>
        <Flex align="center" direction="column" className="relay-gap-4">
          <Flex align="center" justify="center">
            {isValidTokenLogo ? (
              <img
                src={data?.token.logoURI}
                alt={data?.token?.name}
                className="relay-w-[48px] relay-h-[48px] relay-rounded-full"
              />
            ) : null}
            <Flex
              align="center"
              className={cn(
                'relay-w-12 relay-h-12 relay-bg-[var(--relay-colors-amber3)] relay-rounded-full relay-p-3',
                isValidTokenLogo ? '-relay-ml-5' : 'relay-ml-0'
              )}
            >
              <Box className="relay-text-[color:var(--relay-colors-amber9)]">
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  width={24}
                  height={24}
                  className="relay-w-[24px] relay-h-[24px]"
                />
              </Box>
            </Flex>
          </Flex>
          <Text style="subtitle2" color="subtle" className="relay-text-center">
            This token isn't traded on leading U.S. centralized exchanges or
            frequently swapped on major DEXes. Always conduct your own research
            before trading.
          </Text>
          <Flex
            align="center"
            className="relay-gap-3 relay-p-3 relay-bg-[var(--relay-colors-gray2)] relay-rounded-[12px] relay-w-full"
          >
            <Text style="subtitle2" ellipsify>
              {data?.token?.address}
            </Text>
            <CopyToClipBoard text={data?.token?.address ?? ''} />

            <Anchor
              href={`${chain?.explorerUrl}/token/${data?.token?.address}`}
              target="_blank"
              className="relay-h-[14px]"
            >
              <Box className="relay-text-[color:var(--relay-colors-gray9)] hover:relay-text-[color:var(--relay-colors-gray11)]">
                <FontAwesomeIcon icon={faExternalLink} />
              </Box>
            </Anchor>
          </Flex>
          <Flex className="relay-gap-3 relay-w-full">
            <Button
              onClick={() => {
                onDecline?.(data?.token, data?.context)
                onOpenChange(false)
              }}
              color="ghost"
              className="relay-flex-1 relay-justify-center relay-bg-[var(--relay-colors-gray3)] hover:relay-bg-[var(--relay-colors-gray4)]"
            >
              Cancel
            </Button>
            <Button
              cta={true}
              onClick={() => {
                if (data?.token) {
                  const tokenIdentifier = `${data?.token.chainId}:${data?.token.address}`
                  const alreadyAccepted = alreadyAcceptedToken(data?.token)
                  const currentData = getRelayUiKitData()
                  if (!alreadyAccepted) {
                    setRelayUiKitData({
                      acceptedUnverifiedTokens: [
                        ...currentData.acceptedUnverifiedTokens,
                        tokenIdentifier
                      ]
                    })
                  }
                  onAnalyticEvent?.(EventNames.UNVERIFIED_TOKEN_ACCEPTED, {
                    token: data?.token,
                    context: data?.context
                  })
                }
                onAcceptToken(data?.token, data?.context)
              }}
              color="warning"
              className="relay-flex-1 relay-justify-center relay-px-4"
            >
              I Understand
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Modal>
  )
}
