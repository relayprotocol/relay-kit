import type { FC } from 'react'
import {
  Anchor,
  ChainTokenIcon,
  Flex,
  Text
} from '../../../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'
import type { Token } from '../../../../../types/index.js'
import { LoadingSpinner } from '../../../../common/LoadingSpinner.js'
import MoonPayLogo from '../../../../../img/MoonPayLogo.js'

type OnrampProcessingPassthroughStepProps = {
  toToken: Token
  moonpayTxUrl?: string
  amount?: string
  amountToTokenFormatted?: string
}

export const OnrampProcessingPassthroughStep: FC<
  OnrampProcessingPassthroughStepProps
> = ({ toToken, moonpayTxUrl, amount, amountToTokenFormatted }) => {
  return (
    <Flex
      direction="column"
      className="relay-w-full relay-h-full"
    >
      <Text style="h6" className="relay-mb-4">
        Processing Transaction
      </Text>
      <Flex
        align="center"
        className="relay-w-full relay-p-3 relay-mb-2 relay-gap-2 relay-rounded-[12px] relay-bg-[var(--relay-colors-gray2)]"
      >
        <ChainTokenIcon
          chainId={toToken?.chainId}
          tokenlogoURI={toToken?.logoURI}
          tokenSymbol={toToken?.symbol}
          className="relay-w-[32px] relay-h-[32px]"
        />
        <Flex align="start" direction="column">
          <Text style="h6">
            {amountToTokenFormatted} {toToken.symbol}
          </Text>
          <Text style="subtitle3" color="subtle">
            {amount}
          </Text>
        </Flex>
      </Flex>
      <Flex
        direction="column"
        justify="center"
        align="center"
        className="relay-py-4 relay-px-3 relay-rounded-widget-card relay-border relay-border-solid relay-border-[var(--relay-colors-subtle-border-color)]"
      >
        <div className="relay-relative relay-w-[40px] relay-h-[40px]">
          <MoonPayLogo className="relay-rounded-[12px] relay-w-[40px] relay-h-[40px]" />
          <Flex
            align="center"
            justify="center"
            className="relay-absolute relay-rounded-full relay-overflow-hidden relay-w-[24px] relay-h-[24px] relay-bg-[var(--relay-colors-primary3)] -relay-bottom-[6px] -relay-right-[6px] relay-border-2 relay-border-solid relay-border-[var(--relay-colors-modal-background)]"
          >
            <LoadingSpinner
              className="relay-h-[16px] relay-w-[16px] relay-fill-[var(--relay-colors-primary-color)]"
            />
          </Flex>
        </div>
        <Text style="subtitle2" className="relay-mt-[24px] relay-text-center">
          Finalizing your purchase through MoonPay, it may take a few minutes to
          process.
        </Text>
        {moonpayTxUrl ? (
          <Anchor
            href={moonpayTxUrl}
            target="_blank"
            className="relay-flex relay-items-center relay-gap-1 relay-mt-2"
          >
            Track MoonPay transaction{' '}
            <FontAwesomeIcon icon={faUpRightFromSquare} className="relay-w-[14px]" />
          </Anchor>
        ) : null}
      </Flex>
      <Text style="body2" color="subtle" className="relay-mt-2">
        Feel free to leave at any time, MoonPay will email you with updates.
      </Text>
    </Flex>
  )
}
