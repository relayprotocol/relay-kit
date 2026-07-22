import type { paths } from '@relayprotocol/relay-sdk'
import Anchor from '../primitives/Anchor.js'

type RefundReasonProps = {
  reasonCode: NonNullable<
    NonNullable<
      paths['/requests/v3']['get']['responses']['200']['content']['application/json']['requests']
    >[0]['data']
  >['failReason']
}
const RefundReason: React.FC<RefundReasonProps> = ({ reasonCode }) => {
  if (reasonCode && reasonCode != 'N/A') {
    switch (reasonCode) {
      case 'TOO_LITTLE_RECEIVED': {
        return (
          <>
            Your transaction has been refunded because the received amount was
            too low. Try adjusting the slippage or amount.
          </>
        )
      }
      case 'NEW_CALLDATA_INCLUDES_HIGHER_RENT_FEE': {
        return (
          <>
            Your transaction has been refunded because network fees increased.
            Try adjusting the slippage or amount.
          </>
        )
      }
      case 'NEGATIVE_NEW_AMOUNT_AFTER_FEES': {
        return (
          <>
            Your transaction has been refunded because the fees exceeded the
            expected amount. Try adjusting the slippage or amount.
          </>
        )
      }
      case 'NO_QUOTES': {
        return (
          <>
            Your transaction has been refunded because no swap routes were found
            for your request. Try a different token or amount.
          </>
        )
      }
      case 'REVERSE_SWAP_FAILED': {
        return (
          <>
            Your transaction has been refunded because the reverse swap couldn’t
            be completed. Try adjusting the slippage or amount.
          </>
        )
      }
      case 'GENERATE_SWAP_FAILED': {
        return (
          <>
            Your transaction has been refunded because something went wrong
            while setting up your swap. Please try again.
          </>
        )
      }
      case 'SLIPPAGE': {
        return (
          <>
            Your transaction has been refunded because the market price shifted
            more than the allowed slippage. Try adjusting your slippage settings
            or{' '}
            <Anchor
              href="https://docs.relay.link/what-is-relay#intercom"
              target="_blank"
            >
              contact support
            </Anchor>{' '}
            if the issue persists.{' '}
          </>
        )
      }
      case 'DEPOSITED_AMOUNT_TOO_LOW_TO_FILL': {
        return (
          <>
            Your transaction has been refunded because the deposited amount was
            too low. Try adjusting the slippage or amount.
          </>
        )
      }
      case 'AMOUNT_TOO_LOW_TO_REFUND': {
        return (
          <>
            Your transaction amount is insufficient to cover the gas cost for an
            automatic refund. Please{' '}
            <Anchor
              href="https://docs.relay.link/what-is-relay#intercom"
              target="_blank"
            >
              contact support
            </Anchor>{' '}
            if you need assistance.{' '}
          </>
        )
      }
      case 'EXECUTION_REVERTED':
      case 'MISSING_REVERT_DATA': {
        return (
          <>
             Your transaction has been refunded because there was an issue
            during execution. Try adjusting the slippage or amount.
          </>
        )
      }
      case 'DEPOSIT_ADDRESS_MISMATCH':
      case 'DEPOSIT_CHAIN_MISMATCH': //@ts-ignore: legacy reason code (insufficient balance)
      case 'INSUFFICIENT_BALANCE_FOR_REFUND':
      case 'SOLVER_CAPACITY_EXCEEDED':
      case 'UNKNOWN':
      default: {
        return (
          <>
            It looks like an unknown issue occurred during the transaction.
            Please{' '}
            <Anchor
              href="https://docs.relay.link/what-is-relay#intercom"
              target="_blank"
            >
              contact support
            </Anchor>{' '}
            if you have any further questions.{' '}
          </>
        )
      }
    }
  }
}

export default RefundReason
