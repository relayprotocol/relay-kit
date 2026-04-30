import { type FC } from 'react'
import {
  Button,
  ChainIcon,
  Flex,
  Pill,
  Skeleton,
  Text,
  Box,
  Anchor
} from '../../../primitives/index.js'
import { LoadingSpinner } from '../../LoadingSpinner.js'
import { truncateAddress } from '../../../../utils/truncate.js'
import { type Token } from '../../../../types/index.js'
import { getDeadAddress, type RelayChain } from '@relayprotocol/relay-sdk'
import { CopyToClipBoard } from '../../CopyToClipBoard.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQrcode } from '@fortawesome/free-solid-svg-icons/faQrcode'
import { QRCodeCanvas } from 'qrcode.react'
import { generateQrWalletDeeplink } from '../../../../utils/qrcode.js'
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger
} from '@radix-ui/react-popover'

// Transparent 1x1 PNG used as placeholder for QR code center image
const TRANSPARENT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRU5ErkJggg=='

type WaitingForDepositStepProps = {
  fromToken?: Token
  fromChain?: RelayChain
  fromAmountFormatted?: string
  isFetchingQuote?: boolean
  depositAddress?: string
}

export const WaitingForDepositStep: FC<WaitingForDepositStepProps> = ({
  fromToken,
  fromChain,
  fromAmountFormatted,
  isFetchingQuote,
  depositAddress
}) => {
  const qrcodeUrl = generateQrWalletDeeplink(
    fromChain?.vmType,
    fromAmountFormatted,
    fromToken &&
      fromChain &&
      fromToken.address !== getDeadAddress(fromChain?.vmType)
      ? fromToken.address
      : undefined,
    depositAddress,
    fromChain?.id
  )

  return (
    <>
      <Flex
        direction="column"
        className="relay:border relay:border-solid relay:border-[var(--relay-colors-subtle-border-color)] relay:rounded-[8px] relay:px-2 relay:py-3 relay:mb-3 relay:gap-2"
      >
        <Text style="body2">
          Transfer funds manually from your {fromChain?.displayName} wallet to
          Relay's deposit address to complete the bridge.
        </Text>
        <Anchor
          href="https://support.relay.link/en/articles/10269920-how-do-deposit-addresses-work"
          target="_blank"
        >
          Learn More
        </Anchor>
      </Flex>
      <Flex className="relay:gap-1">
        <Flex className="relay:gap-1 relay:w-full" direction="column">
          <Text style="subtitle2">Network</Text>
          <Pill
            color="gray"
            className="relay:flex relay:items-center relay:py-2"
            radius="squared"
          >
            <ChainIcon chainId={fromChain?.id} height={20} width={20} />
            <Text style="h6">{fromChain?.displayName}</Text>
          </Pill>
        </Flex>
        <Flex className="relay:gap-1 relay:w-full" direction="column">
          <Text style="subtitle2">Amount to transfer</Text>
          <Pill
            color="gray"
            className="relay:flex relay:items-center relay:py-2"
            radius="squared"
          >
            {fromAmountFormatted ? (
              <>
                {' '}
                <Text style="h6" className="relay:font-medium relay:mr-1">
                  {fromAmountFormatted}
                </Text>
                <img
                  alt={fromToken?.name}
                  src={fromToken?.logoURI}
                  width={20}
                  height={20}
                  className="relay:rounded-full"
                />
                <Text style="h6">{fromToken?.symbol}</Text>
              </>
            ) : (
              <Skeleton className="relay:h-[24px] relay:w-full" />
            )}{' '}
          </Pill>
        </Flex>
      </Flex>
      <Text style="subtitle2">Relay's Deposit Address</Text>
      <Pill
        radius="rounded"
        color="gray"
        className="relay:flex relay:items-center relay:gap-3 relay:p-3"
      >
        {isFetchingQuote ? (
          <Skeleton className="relay:h-[21px] relay:w-full" />
        ) : (
          <>
            <Text style="subtitle2" className="relay:mr-auto">
              {truncateAddress(depositAddress, '...', 28, 4)}
            </Text>
            {qrcodeUrl ? (
              <Popover>
                <PopoverTrigger className="relay:cursor-pointer">
                  <Box className="relay:text-[color:var(--relay-colors-gray9)]">
                    <FontAwesomeIcon
                      icon={faQrcode}
                      className="relay:w-[16px] relay:h-[16px]"
                    />
                  </Box>
                </PopoverTrigger>
                <PopoverPortal>
                  <PopoverContent
                    sideOffset={4}
                    align="end"
                    side="top"
                    avoidCollisions={false}
                    style={{ zIndex: 10000001 }}
                  >
                    <div
                      style={{
                        borderRadius: 8,
                        padding: 8,
                        backgroundColor: 'var(--relay-colors-modal-background)',
                        boxShadow: '0px 1px 5px rgba(0,0,0,0.2)'
                      }}
                    >
                      <div style={{ position: 'relative', width: 105, height: 105 }}>
                        <QRCodeCanvas
                          value={qrcodeUrl}
                          width={105}
                          height={105}
                          level={'H'}
                          imageSettings={{
                            src: TRANSPARENT_PNG,
                            height: 33,
                            width: 33,
                            excavate: true
                          }}
                          style={{ display: 'block', width: 105, height: 105 }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 105,
                            height: 105,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none'
                          }}
                        >
                          <div style={{ position: 'relative' }}>
                            <img
                              alt={fromToken?.name}
                              src={fromToken?.logoURI}
                              width={33}
                              height={33}
                              style={{
                                borderRadius: '50%',
                                border: '1.5px solid white',
                                backgroundColor: 'white',
                                display: 'block'
                              }}
                            />
                            <ChainIcon
                              chainId={fromChain?.id}
                              height={14}
                              width={14}
                              className="relay:absolute relay:bottom-0 relay:right-0 relay:border relay:border-solid relay:border-white"
                              borderRadius={4}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </PopoverPortal>
              </Popover>
            ) : null}
            <CopyToClipBoard text={depositAddress ?? ''} />
          </>
        )}
      </Pill>
      <Button
        disabled={true}
        className="relay:text-[color:var(--relay-colors-button-disabled-color)_!important] relay:mt-2 relay:justify-center"
      >
        <LoadingSpinner
          className="relay:h-4 relay:w-4 relay:fill-[var(--relay-colors-button-disabled-color)]"
        />
        Waiting for you to transfer funds
      </Button>
    </>
  )
}
