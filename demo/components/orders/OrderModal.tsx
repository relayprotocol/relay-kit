import { FC, ReactNode } from 'react'
import type { Order, OrderProgressData } from '@relayprotocol/relay-sdk'
import { useRelayClient } from '@relayprotocol/relay-kit-ui'
import { Badge, cx, Modal, shortHex, type ErrorInfo } from './common'
import css from './orders.module.css'

export type OrderModalState = {
  status: 'running' | 'success' | 'error'
  order?: Order
  steps?: OrderProgressData['steps']
  error?: ErrorInfo
}

type Step = OrderProgressData['steps'][number]
type RowState = 'done' | 'active' | 'failed' | 'waiting'

const stepPrompt = (step: Step) => {
  const item = step.items.find((item) => item.status === 'incomplete')
  if (step.kind === 'transaction') {
    return item?.txHashes?.length
      ? 'Waiting for confirmation'
      : 'Confirm in your wallet'
  }
  return item?.isValidatingSignature || item?.progressState === 'posting'
    ? 'Submitting signature'
    : 'Sign in your wallet'
}

const Icon: FC<{ state: RowState }> = ({ state }) => (
  <span className={cx(css.stepIcon, css[`stepIcon_${state}`])}>
    {state === 'done' ? '✓' : state === 'failed' ? '!' : ''}
  </span>
)

const Row: FC<{ state: RowState; title: string; children?: ReactNode }> = ({
  state,
  title,
  children
}) => (
  <li className={css.modalStep}>
    <Icon state={state} />
    <div className={css.modalStepText}>
      <b>{title}</b>
      {children}
    </div>
  </li>
)

export const OrderModal: FC<{
  state?: OrderModalState
  summary: ReactNode
  onRetry: () => void
  onViewOrder: () => void
  onClose: () => void
}> = ({ state, summary, onRetry, onViewOrder, onClose }) => {
  const client = useRelayClient()

  const txLinks = (step: Step) =>
    step.items.flatMap((item) =>
      (item.txHashes ?? []).map(({ txHash, chainId }) => {
        const explorer = client?.chains.find(
          (chain) => chain.id === chainId
        )?.explorerUrl
        return (
          <a
            key={txHash}
            href={explorer ? `${explorer}/tx/${txHash}` : undefined}
            target="_blank"
            rel="noreferrer"
            className={css.modalLink}
          >
            View tx {shortHex(txHash)}
          </a>
        )
      })
    )

  const steps = state?.steps ?? []
  const activeIndex = steps.findIndex((step) =>
    step.items.some((item) => item.status === 'incomplete')
  )
  const failed = state?.status === 'error'

  const progress = state && (
    <ol className={css.modalSteps}>
      <Row
        state={state.order ? 'done' : failed ? 'failed' : 'active'}
        title="Create order"
      >
        <span>
          {state.order
            ? shortHex(state.order.id)
            : failed
              ? 'Relay did not create the order'
              : 'Sending the order to Relay'}
        </span>
      </Row>
      {steps.map((step, index) => {
        const rowState: RowState =
          activeIndex === -1 || index < activeIndex
            ? 'done'
            : index > activeIndex
              ? 'waiting'
              : failed
                ? 'failed'
                : 'active'
        return (
          <Row key={step.id} state={rowState} title={step.action || step.id}>
            {rowState === 'active' && <span>{stepPrompt(step)}</span>}
            {txLinks(step)}
          </Row>
        )
      })}
    </ol>
  )

  return (
    <Modal
      open={Boolean(state)}
      label="Place order"
      onClose={state?.status === 'running' ? undefined : onClose}
    >
      {state?.status === 'running' && (
        <>
          <h2 className={css.modalTitle}>Placing order</h2>
          <div className={css.modalSummary}>{summary}</div>
          {progress}
        </>
      )}

      {state?.status === 'success' && state.order && (
        <>
          <div className={cx(css.modalHero, css.modalHeroSuccess)}>✓</div>
          <h2 className={cx(css.modalTitle, css.modalCenter)}>Order placed</h2>
          <div className={css.modalSummary}>{summary}</div>
          <dl className={css.summary}>
            <dt>Order</dt>
            <dd className={css.mono}>{shortHex(state.order.id)}</dd>
            <dt>Status</dt>
            <dd>
              <Badge value={state.order.status} />
            </dd>
            <dt>Expires</dt>
            <dd>{new Date(state.order.expiresAt).toLocaleString()}</dd>
          </dl>
          {steps.flatMap(txLinks)}
          <div className={css.modalActions}>
            <button className={css.btn} onClick={onViewOrder}>
              View order
            </button>
            <button className={css.cta} onClick={onClose}>
              Done
            </button>
          </div>
        </>
      )}

      {state?.status === 'error' && (
        <>
          <div className={cx(css.modalHero, css.modalHeroError)}>!</div>
          <h2 className={cx(css.modalTitle, css.modalCenter)}>
            {state.order ? 'Order created but not open' : 'Order not placed'}
          </h2>
          <p className={css.modalError}>
            {state.error?.message}
            {state.error?.errorCode && <code> {state.error.errorCode}</code>}
          </p>
          {state.order && (
            <p className={css.hint}>
              The order stays pending until its steps finish. Retry them here or
              with Sign order in the Orders tab.
            </p>
          )}
          {progress}
          <div className={css.modalActions}>
            {state.order ? (
              <button className={css.btn} onClick={onViewOrder}>
                View order
              </button>
            ) : (
              <button className={css.btn} onClick={onClose}>
                Close
              </button>
            )}
            <button className={css.cta} onClick={onRetry}>
              Try again
            </button>
          </div>
          {state.order && (
            <button className={css.linkBtn} onClick={onClose}>
              Close
            </button>
          )}
        </>
      )}
    </Modal>
  )
}
