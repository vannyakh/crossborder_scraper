import { useEffect } from 'react'
import { useThemeStore } from '../stores/theme-store'

/** Applies branding from theme store (favicon, etc.). */
export function usePanelAppearance() {
  const branding = useThemeStore((s) => s.config.branding)

  useEffect(() => {
    const href = branding.faviconUrl
    if (!href) return
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = href
  }, [branding.faviconUrl])
}
