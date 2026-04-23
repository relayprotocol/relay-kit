import useIsMounted from 'hooks/useIsMounted'
import { useRouter } from 'next/router'
import { FC } from 'react'

const API_OPTIONS = ['mainnets', 'mainnets-dev', 'testnets'] as const
type ApiOption = (typeof API_OPTIONS)[number]

const isApiOption = (value: unknown): value is ApiOption =>
  typeof value === 'string' && (API_OPTIONS as readonly string[]).includes(value)

export const BaseApiSwitcher: FC = () => {
  const router = useRouter()
  const isMounted = useIsMounted()

  if (!isMounted) return null
  return (
    <select
      value={isApiOption(router.query.api) ? router.query.api : 'mainnets'}
      onChange={(e) => {
        const selectedValue = e.target.value
        router.push({
          pathname: router.pathname,
          query: { ...router.query, api: selectedValue }
        })
      }}
      style={{
        border: '1px solid gray',
        borderRadius: 4,
        padding: '3.5px 10px'
      }}
    >
      <option value="mainnets">Mainnets (Main)</option>
      <option value="mainnets-dev">Mainnets (Dev)</option>
      <option value="testnets">Testnets</option>
    </select>
  )
}
