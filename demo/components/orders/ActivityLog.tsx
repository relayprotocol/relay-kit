import { FC, useCallback, useRef, useState } from 'react'
import { Badge, cx, errorInfo, ErrorInfo, Json } from './common'
import css from './orders.module.css'

export type LogEntry = {
  id: number
  time: string
  action: string
  params?: unknown
  status: 'running' | 'ok' | 'error'
  progress?: unknown
  result?: unknown
  error?: ErrorInfo
}

export type RunAction = <T>(
  action: string,
  params: unknown,
  fn: (onProgress: (progress: unknown) => void) => Promise<T>
) => Promise<T | undefined>

/** Runs SDK actions and records their parameters, progress, result or error */
export function useActivityLog() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const nextId = useRef(1)

  const update = (id: number, patch: Partial<LogEntry>) =>
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    )

  const run: RunAction = useCallback(async (action, params, fn) => {
    const id = nextId.current++
    setEntries((current) => [
      {
        id,
        time: new Date().toLocaleTimeString(),
        action,
        params,
        status: 'running'
      },
      ...current
    ])
    try {
      const result = await fn((progress) => update(id, { progress }))
      update(id, { status: 'ok', result })
      return result
    } catch (error) {
      console.error(action, error)
      update(id, { status: 'error', error: errorInfo(error) })
      return undefined
    }
  }, [])

  return { entries, run, clear: () => setEntries([]) }
}

const statusBadge = (entry: LogEntry) =>
  entry.status === 'error' ? (
    <Badge value={entry.error?.errorCode ?? 'error'} tone="failed" />
  ) : (
    <Badge
      value={entry.status}
      tone={entry.status === 'ok' ? 'filled' : 'pending'}
    />
  )

export const ActivityLog: FC<{ entries: LogEntry[]; onClear: () => void }> = ({
  entries,
  onClear
}) => {
  const errors = entries.filter((entry) => entry.status === 'error').length
  return (
    <details className={cx(css.panel, css.collapsible, css.activity)}>
      <summary>
        <span className={css.grow}>
          Activity log <span className={css.count}>{entries.length}</span>
          {errors > 0 && (
            <>
              {' '}
              <Badge value={`${errors} failed`} tone="failed" />
            </>
          )}
        </span>
        {entries[0] && (
          <span className={css.hint}>
            Latest: <code>{entries[0].action}</code> {statusBadge(entries[0])}
          </span>
        )}
      </summary>
      <div className={css.collapsibleBody}>
        <div className={css.spread}>
          <span className={css.hint}>
            Every SDK call on this page, newest first. Open one for its
            parameters, progress and result.
          </span>
          <button className={cx(css.btn, css.btnSmall)} onClick={onClear}>
            Clear
          </button>
        </div>
        <div>
          {entries.length === 0 && (
            <div className={css.empty}>Nothing yet.</div>
          )}
          {entries.map((entry) => (
            <details key={entry.id} className={css.logEntry}>
              <summary>
                <div className={css.row}>
                  <span className={css.hint}>{entry.time}</span>
                  <code>{entry.action}</code>
                  {statusBadge(entry)}
                </div>
                {entry.error && (
                  <div className={css.error}>{entry.error.message}</div>
                )}
              </summary>
              <div className={css.collapsibleBody}>
                <span className={css.label}>Parameters</span>
                <Json value={entry.params} />
                {entry.progress !== undefined && (
                  <>
                    <span className={css.label}>Latest progress</span>
                    <Json value={entry.progress} />
                  </>
                )}
                {entry.result !== undefined && (
                  <>
                    <span className={css.label}>Result</span>
                    <Json value={entry.result} />
                  </>
                )}
                {entry.error?.raw !== undefined && (
                  <>
                    <span className={css.label}>API error</span>
                    <Json value={entry.error.raw} />
                  </>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </details>
  )
}
