import dayjs from 'dayjs'
import time from 'dayjs/plugin/relativeTime.js'

dayjs.extend(time)

export const relativeTime = (
  timeString?: string | number,
  from?: string | number,
  withoutSuffix?: boolean
): string => {
  return from
    ? `${dayjs(timeString).from(from, withoutSuffix)}`
    : `${dayjs(timeString).fromNow(withoutSuffix)}`
}

export const formatSeconds = (seconds: number): string => {
  seconds = Number(seconds)
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0) parts.push(`${s}s`)

  return parts.join(' ')
}

export const get15MinuteInterval = () => {
  const now = new Date()
  const minutes = now.getUTCMinutes()
  const interval = Math.floor(minutes / 15)
  const intervalStart = new Date(now)
  intervalStart.setUTCMinutes(interval * 15, 0, 0)
  return intervalStart.getTime()
}
