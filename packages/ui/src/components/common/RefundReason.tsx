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
      case 'NO_QUOTES':
      case 'NO_INTERNAL_SWAP_ROUTES_FOUND': {
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
      case 'TRANSACTION_REVERTED':
      case 'FLUID_DEX_ERROR':
      case 'MISSING_REVERT_DATA': {
        return (
          <>
             Your transaction has been refunded because there was an issue
            during execution. Try adjusting the slippage or amount.
          </>
        )
      }
      case 'DEPOSIT_CHAIN_MISMATCH':
      case 'INCORRECT_DEPOSIT_CURRENCY':
      case 'ORIGIN_CURRENCY_MISMATCH': {
        return (
          <>
            Your transaction has been refunded because the chain or token
            received didn’t match the quote.
          </>
        )
      }
      case 'DOUBLE_SPEND': {
        return (
          <>
            Your transfer couldn’t be processed because a deposit was already
            completed for this request. Please{' '}
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
      case 'TTL_EXPIRED':
      case 'DEPOSIT_CONFIRMATION_TIMEOUT': {
        return (
          <>
            Your transaction has been refunded because the deposit wasn’t
            confirmed in time. Please try again.
          </>
        )
      }
      case 'DEPOSIT_REORGED': {
        return (
          <>
            Your transaction could not be completed because of a temporary
            network issue affecting your deposit. Please try again.
          </>
        )
      }
      case 'ORPHANED_DEPOSIT_REFUND': {
        return (
          <>
            Your deposit couldn’t be matched to an active request, so it has
            been refunded.
          </>
        )
      }
      case 'BLOCKED_WALLET': {
        return (
          <>
            This transaction couldn’t be completed because an address
            associated with it didn’t meet our risk management standards.
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
      case 'SOLVER_CAPACITY_EXCEEDED':
      case 'SOLVER_BALANCE_TOO_LOW':
      case 'SPONSOR_BALANCE_TOO_LOW': {
        return (
          <>
            Your transaction has been refunded because there wasn’t enough
            capacity available for this route right now. Please try again
            later.
          </>
        )
      }
      case 'GASLESS_PERMIT_BALANCE_TOO_LOW': {
        return (
          <>
            Your transaction could not be completed because the available
            balance was too low, so the funds have been refunded.
          </>
        )
      }
      case 'INSUFFICIENT_FUNDS_FOR_RENT': {
        return (
          <>
            Your transaction could not be completed because the balance wasn’t
            enough to cover Solana network fees. Please try again with a larger
            amount.
          </>
        )
      }
      case 'SWAP_IMPACT_TOO_HIGH': {
        return (
          <>
            Your transaction has been refunded because the swap’s price impact
            was too high. Try a smaller amount or a different token.
          </>
        )
      }
      case 'INSUFFICIENT_POOL_LIQUIDITY': {
        return (
          <>
            Your transaction has been refunded because there wasn’t enough
            liquidity to complete the swap. Try a smaller amount or try again
            later.
          </>
        )
      }
      case 'TRANSACTION_TOO_LARGE':
      case 'SWAP_USES_TOO_MUCH_GAS':
      case 'QUOTED_GAS_LIMIT_EXCEEDED':
      case 'INVALID_GAS_PRICE': {
        return (
          <>
            Your transaction has been refunded because it couldn’t be executed
            within network limits. Try a smaller amount or a different route.
          </>
        )
      }
      case 'JUPITER_INVALID_TOKEN_ACCOUNT': {
        return (
          <>
            Your transaction could not be completed because a required Solana
            token account was missing or invalid. Please try again.
          </>
        )
      }
      case 'CONTRACT_PAUSED': {
        return (
          <>
            Your transaction has been refunded because the destination contract
            is currently paused. Please try again later.
          </>
        )
      }
      case 'TOKEN_NOT_TRANSFERABLE':
      case 'DESTINATION_TOKEN_TRANSFER_REJECTED':
      case 'TRANSFER_FAILED': {
        return (
          <>
            Your transaction has been refunded because the token rejected the
            transfer. Some tokens have transfer restrictions, taxes, or limits.
          </>
        )
      }
      case 'TRANSFER_FROM_FAILED':
      case 'TRANSFER_AMOUNT_EXCEEDS_ALLOWANCE': {
        return (
          <>
            Your transaction has been refunded because the token approval was
            insufficient for the transfer amount. Please try again.
          </>
        )
      }
      case 'TRANSFER_AMOUNT_EXCEEDS_BALANCE':
      case 'INSUFFICIENT_NATIVE_TOKENS_SUPPLIED':
      case 'INCORRECT_PAYMENT':
      case 'ZERO_SELL_AMOUNT': {
        return (
          <>
            Your transaction has been refunded because the amount available
            didn’t match what the transaction required.
          </>
        )
      }
      case 'SIGNATURE_EXPIRED':
      case 'INVALID_SIGNATURE':
      case 'INVALID_NONCE':
      case 'INVALID_SENDER':
      case 'INVALID_SIGNER': {
        return (
          <>
            Your transaction has been refunded because there was a signature or
            authorization issue. Please try again.
          </>
        )
      }
      case 'ORDER_EXPIRED':
      case 'PROTOCOL_DEADLINE_EXPIRED': {
        return (
          <>
            Your transaction has been refunded because the order expired before
            it could be completed. Please try again.
          </>
        )
      }
      case 'ORDER_ALREADY_FILLED': {
        return (
          <>
            Your transaction has been refunded because the order was already
            filled by another transaction. This can happen when multiple
            transactions target the same order simultaneously.
          </>
        )
      }
      case 'ORDER_IS_CANCELLED': {
        return (
          <>
            Your transaction has been refunded because the order was canceled
            before it could be completed.
          </>
        )
      }
      case 'MINT_NOT_ACTIVE': {
        return (
          <>
            Your transaction has been refunded because the mint is not
            currently active. The mint may not have started yet or may have
            already ended.
          </>
        )
      }
      case 'SEAPORT_INEXACT_FRACTION':
      case 'SEAPORT_INVALID_FULFILLER': {
        return (
          <>
            Your transaction has been refunded because the marketplace order
            couldn’t be fulfilled.
          </>
        )
      }
      case 'ACCOUNT_ABSTRACTION_INVALID_NONCE':
      case 'ACCOUNT_ABSTRACTION_SIGNATURE_ERROR':
      case 'ACCOUNT_ABSTRACTION_GAS_LIMIT': {
        return (
          <>
            Your transaction has been refunded because there was an issue with
            your smart account operation. Please try again.
          </>
        )
      }
      case 'ERC_1155_TOO_MANY_REQUESTED':
      case 'MINT_QUANTITY_EXCEEDS_MAX_PER_WALLET':
      case 'MINT_QUANTITY_EXCEEDS_MAX_SUPPLY': {
        return (
          <>
            Your transaction has been refunded because the requested mint
            quantity exceeds what’s allowed for this collection.
          </>
        )
      }
      case 'MANUAL_ADMIN_REFUND': {
        return (
          <>
            Your transaction has been refunded manually by the Relay team.
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
      case 'DEPOSIT_ADDRESS_MISMATCH': //@ts-ignore: legacy reason code (insufficient balance)
      case 'INSUFFICIENT_BALANCE_FOR_REFUND':
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
