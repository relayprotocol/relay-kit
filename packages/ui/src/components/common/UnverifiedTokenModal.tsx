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
      css={{
        overflow: 'hidden',
        zIndex: 1000
      }}
      overlayZIndex={10001}
    >
      <Flex
        direction="column"
        css={{
          width: '100%',
          height: '100%',
          gap: '4',
          sm: {
            width: 370
          }
        }}
      >
        <Text style="h6">Unverified Token</Text>
        <Flex align="center" direction="column" css={{ gap: '4' }}>
          <Flex align="center" justify="center">
            {isValidTokenLogo ? (
              <img
                src={data?.token.logoURI}
                alt={data?.token?.name}
                style={{ width: '48px', height: '48px', borderRadius: 9999 }}
              />
            ) : null}
            <Flex
              align="center"
              css={{
                width: '48px',
                height: '48px',
                background: 'amber3',
                borderRadius: 9999,
                p: '3',
                marginLeft: isValidTokenLogo ? '-20px' : '0'
              }}
            >
              <Box css={{ color: 'amber9' }}>
                <FontAwesomeIcon
                  icon={faExclamationTriangle}
                  width={24}
                  height={24}
                  style={{ width: 24, height: 24 }}
                />
              </Box>
            </Flex>
          </Flex>
          <Text style="subtitle2" color="subtle" css={{ textAlign: 'center' }}>
            This token isn’t traded on leading U.S. centralized exchanges or
            frequently swapped on major DEXes. Always conduct your own research
            before trading.
          </Text>
          <Flex
            align="center"
            css={{
              gap: '3',
              p: '3',
              bg: 'gray2',
              borderRadius: '12px',
              width: '100%'
            }}
          >
            <Text style="subtitle2" ellipsify>
              {data?.token?.address}
            </Text>
            <CopyToClipBoard text={data?.token?.address ?? ''} />

            <Anchor
              href={`${chain?.explorerUrl}/token/${data?.token?.address}`}
              target="_blank"
              css={{ height: '14px' }}
            >
              <Box css={{ color: 'gray9', _hover: { color: 'gray11' } }}>
                <FontAwesomeIcon icon={faExternalLink} />
              </Box>
            </Anchor>
          </Flex>
          <Flex css={{ gap: '3', width: '100%' }}>
            <Button
              onClick={() => {
                onDecline?.(data?.token, data?.context)
                onOpenChange(false)
              }}
              color="ghost"
              css={{
                flex: 1,
                justifyContent: 'center',
                bg: 'gray3',
                _hover: { bg: 'gray4' }
              }}
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
              css={{ flex: 1, justifyContent: 'center', px: '16px' }}
            >
              I Understand
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Modal>
  )
}
