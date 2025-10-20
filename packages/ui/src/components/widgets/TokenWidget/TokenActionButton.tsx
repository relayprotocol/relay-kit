import { type FC } from 'react'
import { Button } from '../../primitives/index.js'
import { useMounted } from '../../../hooks/index.js'

type TokenActionButtonProps = {
  onClick: () => void
  ctaCopy: string
  disabled?: boolean
  isFetchingQuote?: boolean
  hasValidAmount?: boolean
  onConnectWallet?: () => void
  address?: string
}

const TokenActionButton: FC<TokenActionButtonProps> = ({
  onClick,
  ctaCopy,
  disabled = false,
  isFetchingQuote = false,
  hasValidAmount = false,
  onConnectWallet,
  address
}) => {
  const isMounted = useMounted()

  // If wallet is connected, show action button
  if (isMounted && address) {
    return (
      <Button
        css={{
          justifyContent: 'center',
          width: '100%',
          textTransform: 'uppercase',
          fontFamily: 'heading',
          fontWeight: 700,
          fontStyle: 'var(--relay-fonts-button-cta-font-style, italic)'
        }}
        color="primary"
        aria-label={ctaCopy}
        cta={true}
        disabled={false}
        data-testid="token-action-button"
        onClick={onClick}
      >
        {ctaCopy}
      </Button>
    )
  }

  // If wallet not connected, show connect wallet button
  return (
    <Button
      cta={true}
      css={{
        justifyContent: 'center',
        width: '100%',
        textTransform: 'uppercase',
        fontFamily: 'heading',
        fontWeight: 700,
        fontStyle: 'var(--relay-fonts-button-cta-font-style, italic)'
      }}
      aria-label="Connect wallet"
      onClick={() => {
        if (!onConnectWallet) {
          throw 'Missing onWalletConnect function'
        }
        onConnectWallet()
      }}
      data-testid="token-widget-connect-wallet-button"
    >
      Connect Wallet
    </Button>
  )
}

export default TokenActionButton
