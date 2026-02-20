import * as React from 'react'

/**
 * Returns the current color scheme mode ('light' or 'dark') by watching for
 * the presence of the 'dark' class on the <html> element.
 * Updates reactively when the class changes (e.g. theme toggle).
 */
export function useIsDarkMode(): 'light' | 'dark' {
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    if (typeof document === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  React.useEffect(() => {
    const el = document.documentElement
    const observer = new MutationObserver(() => {
      setIsDark(el.classList.contains('dark'))
    })
    observer.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark ? 'dark' : 'light'
}
